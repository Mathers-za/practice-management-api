export function validationMiddleWare(validationSchemaCb) {
  return async function validateMiddleware(req, res, next) {
    try {
      const validatedData = await validationSchemaCb.validate(req.body);
      req.validatedData = validatedData;
      next();
    } catch (error) {
      next(error);
    }
  };
}
