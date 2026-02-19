/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as projects from "../projects.js";
import type * as repos from "../repos.js";
import type * as tasks from "../tasks.js";
import type * as uiStudio from "../uiStudio.js";
import type * as users from "../users.js";
import type * as voice from "../voice.js";
import type * as voiceStream from "../voiceStream.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  projects: typeof projects;
  repos: typeof repos;
  tasks: typeof tasks;
  uiStudio: typeof uiStudio;
  users: typeof users;
  voice: typeof voice;
  voiceStream: typeof voiceStream;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
