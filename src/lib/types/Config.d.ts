import type { PageType } from "./PageType";

export interface Config {
    networkRequired?: boolean,
    pages: PageType[]
}