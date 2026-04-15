import type { User } from "@prisma/client";
import { redis } from "../lib/redis.js";
import z from "zod";
import { logger } from "../lib/logger.js";

const userSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  id: z.uuid(),
  emailVerified: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const getKey = (id: string) => {
  return `user-${id}`;
};

const getUserFromCache = async (
  userId: string,
): Promise<Omit<User, "password" | "tokens"> | null> => {
  try {
    const key = getKey(userId);
    const res = await redis.get(key);

    if (!res) return null;

    try {
      const userData = JSON.parse(res);
      const validatedUserData = userSchema.parse(userData);
      return validatedUserData;
    } catch (parseError) {
      logger.error({ err: parseError, key }, "Cache corruption detected — evicting key");
      await redis.del(key).catch(() => {});
      return null;
    }
  } catch (e) {
    logger.error({ err: e }, "Redis GET failed");
    return null;
  }
};

const addUserToCache = async (
  userId: string,
  data: Omit<User, "password" | "tokens">,
  EX: number,
): Promise<boolean> => {
  try {
    const key = getKey(userId);
    const validatedData = userSchema.parse(data);
    await redis.set(key, JSON.stringify(validatedData), "EX", EX);
    return true;
  } catch (e) {
    logger.error({ err: e }, "Redis SET failed");
    return false;
  }
};

const deleteUserFromCache = async (userId: string): Promise<boolean> => {
  try {
    const key = getKey(userId);
    await redis.del(key);
    return true;
  } catch (e) {
    logger.error({ err: e }, "Redis DEL failed");
    return false;
  }
};

export default {
  getUserFromCache,
  addUserToCache,
  deleteUserFromCache,
};
