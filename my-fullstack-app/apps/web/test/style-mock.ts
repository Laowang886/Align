export default new Proxy(
  {},
  { get: (_target, property) => String(property) },
);
