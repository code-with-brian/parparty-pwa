/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as aiService from "../aiService.js";
import type * as analytics from "../analytics.js";
import type * as courses from "../courses.js";
import type * as foodOrders from "../foodOrders.js";
import type * as games from "../games.js";
import type * as golfCourses from "../golfCourses.js";
import type * as guests from "../guests.js";
import type * as highlights from "../highlights.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as photos from "../photos.js";
import type * as seedSponsors from "../seedSponsors.js";
import type * as socialPosts from "../socialPosts.js";
import type * as socialSharing from "../socialSharing.js";
import type * as sponsors from "../sponsors.js";
import type * as userConversion from "../userConversion.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  aiService: typeof aiService;
  analytics: typeof analytics;
  courses: typeof courses;
  foodOrders: typeof foodOrders;
  games: typeof games;
  golfCourses: typeof golfCourses;
  guests: typeof guests;
  highlights: typeof highlights;
  notifications: typeof notifications;
  payments: typeof payments;
  photos: typeof photos;
  seedSponsors: typeof seedSponsors;
  socialPosts: typeof socialPosts;
  socialSharing: typeof socialSharing;
  sponsors: typeof sponsors;
  userConversion: typeof userConversion;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
