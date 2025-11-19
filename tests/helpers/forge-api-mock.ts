import type { RequestInit, Response } from '@forge/api';

type RequestHandler = {
  matches: (url: string) => boolean;
  handle: (url: string, init?: RequestInit) => Promise<Response>;
};

interface JiraUserResponse {
  accountId?: string;
  displayName?: string;
  avatarUrls?: Record<string, string>;
}

const clone = <T>(value: T): T => {
  if (value === undefined || value === null) {
    return value;
  }
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

const buildResponse = (body: unknown, overrides?: Partial<Response>): Response => ({
  ok: overrides?.ok ?? true,
  status: overrides?.status ?? 200,
  statusText: overrides?.statusText ?? 'OK',
  headers: overrides?.headers ?? {
    append() {},
    delete() {},
    get: () => null,
    has: () => false,
    set() {},
    forEach() {},
  },
  json: async () => body,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  arrayBuffer: async () => new ArrayBuffer(0),
});

const toMatcher = (matcher: string | RegExp | ((url: string) => boolean)) => {
  if (typeof matcher === 'function') {
    return matcher;
  }
  if (matcher instanceof RegExp) {
    return (url: string) => matcher.test(url);
  }
  return (url: string) => url === matcher;
};

export const createForgeApiMock = () => {
  const store = new Map<string, any>();
  const profileQueue: JiraUserResponse[] = [];
  const handlers: Record<'user' | 'app', RequestHandler[]> = {
    user: [],
    app: [],
  };

  const request = async (scope: 'user' | 'app', url: string, init?: RequestInit): Promise<Response> => {
    for (const handler of handlers[scope]) {
      if (handler.matches(url)) {
        return handler.handle(url, init);
      }
    }

    if (scope === 'user' && url.includes('/rest/api/3/myself')) {
      const profile = profileQueue.shift();
      if (!profile) {
        return buildResponse({ message: 'No mock profile queued' }, { ok: false, status: 404 });
      }
      return buildResponse(profile);
    }

    return buildResponse({ message: `Unhandled ${scope} Jira request for ${url}` }, { ok: false, status: 501 });
  };

  const storage = {
    async get(key: string) {
      return clone(store.get(key));
    },
    async set(key: string, value: any) {
      store.set(key, clone(value));
    },
    async delete(key: string) {
      store.delete(key);
    },
    async getSecret() {
      return undefined;
    },
    async setSecret() {
      return;
    },
    async deleteSecret() {
      return;
    },
    entity() {
      return {
        get: async () => undefined,
        set: async () => undefined,
        delete: async () => undefined,
      };
    },
    query() {
      let prefix = '';
      let limitValue = 20;
      let cursorValue: number | undefined;
      const builder = {
        where(field: string, condition: { condition: string; value: string }) {
          if (field !== 'key' || condition.condition !== 'STARTS_WITH') {
            throw new Error('Mock storage only supports startsWith queries on key');
          }
          prefix = condition.value;
          return builder;
        },
        cursor(cursor: string) {
          cursorValue = Number(cursor);
          return builder;
        },
        limit(limit: number) {
          limitValue = limit;
          return builder;
        },
        async getMany() {
          const entries = Array.from(store.entries()).filter(([key]) => key.startsWith(prefix));
          const start = cursorValue ?? 0;
          const slice = entries.slice(start, start + limitValue);
          const results = slice.map(([key, value]) => ({ key, value: clone(value) }));
          const nextCursor = start + slice.length < entries.length ? String(start + slice.length) : undefined;
          return { results, nextCursor };
        },
        async getOne() {
          const previousLimit = limitValue;
          limitValue = 1;
          const { results } = await builder.getMany();
          limitValue = previousLimit;
          return results[0];
        },
      };
      return builder;
    },
  };

  const defaultRoute = (strings: TemplateStringsArray, ...values: Array<string | number>): string =>
    strings.reduce((acc, part, index) => `${acc}${part}${values[index] ?? ''}`, '');

  const registerHandler = (
    scope: 'user' | 'app',
    matcher: string | RegExp | ((url: string) => boolean),
    handle: (url: string, init?: RequestInit) => Promise<Response>
  ) => {
    handlers[scope].push({
      matches: toMatcher(matcher),
      handle,
    });
  };

  const resetHandlers = () => {
    handlers.user = [];
    handlers.app = [];
  };

  const __testing = {
    enqueueMyselfResponse(profile: JiraUserResponse) {
      profileQueue.push(profile);
    },
    listKeys(prefix?: string) {
      const keys = Array.from(store.keys());
      if (!prefix) {
        return keys;
      }
      return keys.filter((key) => key.startsWith(prefix));
    },
    getValue(key: string) {
      return clone(store.get(key));
    },
    reset() {
      store.clear();
      profileQueue.length = 0;
      resetHandlers();
    },
    onUserRequest(matcher: string | RegExp | ((url: string) => boolean), handler: RequestHandler['handle']) {
      registerHandler('user', matcher, handler);
    },
    onAppRequest(matcher: string | RegExp | ((url: string) => boolean), handler: RequestHandler['handle']) {
      registerHandler('app', matcher, handler);
    },
  };

  const api = {
    asUser: () => ({
      requestJira: (url: string, init?: RequestInit) => request('user', typeof url === 'string' ? url : String(url), init),
    }),
    asApp: () => ({
      requestJira: (url: string, init?: RequestInit) => request('app', typeof url === 'string' ? url : String(url), init),
    }),
  };

  return {
    __esModule: true,
    default: Object.assign(api, { __testing }),
    storage,
    route: defaultRoute,
  };
};
