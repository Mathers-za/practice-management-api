export function applyValidationFn(validationSchemaCb) {
  return async function validateMiddleware(req, res, next) {
    try {
      await validationSchemaCb.validate(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}
