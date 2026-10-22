import catalogJson from '../data/catalog.json';
import type { Catalog } from './engine/catalog';

export const catalog = catalogJson as Catalog;
export const byId = new Map(catalog.items.map((i) => [i.id, i]));
