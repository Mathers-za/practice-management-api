import { CustomError } from "./newClasses.js";
export function validationRequestBodyMiddleWare(validationSchemaCb) {
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

export function validationRequestParamsMiddleWare(req, res, next) {
  console.log("look im here");
  console.log(req.params.id);
  console.log(typeof req.params.id);
  try {
    if (req.params.id === "undefined" || !req.params.id) {
      console.log("made it here");
      throw new CustomError("badRequest", "Request params are undefined", 400);
    }
    next();
  } catch (error) {
    console.error(error);
    next(error);
  }
}

export function validationRequestQueryMiddleWare(queryArray) {
  return function checkRequestqueries(req, res, next) {
    try {
      const isAllQueriesPresent = queryArray.every((query) => {
        return req.query.hasOwnProperty(query);
      });

      if (!isAllQueriesPresent) {
        throw new CustomError(
          "badRequest",
          "Request queries (one or more) are missing",
          400
        );
      } else next();
    } catch (error) {
      next(error);
    }
  };
}
