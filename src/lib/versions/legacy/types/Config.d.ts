import type { PageType } from "./PageType";

export interface LegacyConfig {
    version?: undefined,
    networkRequired?: boolean,
    pages: PageType[]
}
