import { Prisma, type User } from "@prisma/client";
import prisma from "../lib/prisma.js";
import { appError, errorType } from "../errors/errors.js";

const getUser = async (
  id: string,
  throwErrorIfNotFound: boolean = false,
): Promise<Omit<User, "password"> | null> => {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });
  if (!user) {
    if (!throwErrorIfNotFound) return user;
    throw new appError(404, "User not found!");
  }
  const { password, ...rest } = user;
  return rest;
};

const editUser = async (
  id: string,
  fields: Partial<Omit<User, "password" | "email" | "id">>,
  throwErrorIfNotFound: boolean = false,
): Promise<Omit<User, "password"> | null> => {
  try {
    const user = await prisma.user.update({
      where: {
        id,
      },
      data: fields,
    });
    const { password, ...rest } = user;
    return rest;
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2025"
    ) {
      if (throwErrorIfNotFound)
        throw new appError(404, "User not found!", errorType.USER_NOT_FOUND);
      return null;
    }
    throw e;
  }
};

const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    await prisma.user.delete({
      where: { id: userId },
    });
    return true;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return false;
    }
    throw error;
  }
};
export default {
  getUser,
  editUser,
  deleteUser,
};
