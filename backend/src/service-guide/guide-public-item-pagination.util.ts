/** Paginate a list after visibility filtering — total reflects filtered count. */

export function paginateFilteredList<T>(
  items: T[],
  page: number,
  pageSize: number,
): { list: T[]; total: number; page: number; pageSize: number } {
  const total = items.length;
  const start = (page - 1) * pageSize;
  const list = start >= total ? [] : items.slice(start, start + pageSize);
  return { list, total, page, pageSize };
}
