import type { LegacyConfig } from "../versions/legacy/types/Config";
import type { ConfigV1 } from "../versions/1/types";

export type Config = LegacyConfig | ConfigV1;
