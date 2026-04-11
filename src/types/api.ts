import type { AppConfig } from "./config";

export type MasterUserItem = {
  code: string;
  createdAt: number;
  updatedAt: number;
};

export type MasterListUsersResponse = {
  users: MasterUserItem[];
};

export type MasterCreateUserResponse = {
  code: string;
};

export type UserConfigResponse = {
  config: AppConfig;
  updatedAt: number;
};

