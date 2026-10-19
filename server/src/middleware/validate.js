import { ZodError } from "zod";

/**
 * Reusable request body validation middleware using Zod schemas
 * @param {import("zod").ZodSchema} schema
 */
export const validate = (schema) => {
  return async (req, res, next) => {
    try {
      const validatedData = await schema.parseAsync(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = {};
        for (const issue of error.issues) {
          const field = issue.path.join(".") || "general";
          if (!fieldErrors[field]) {
            fieldErrors[field] = issue.message;
          }
        }

        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: fieldErrors
        });
      }
      next(error);
    }
  };
};

export const validateBody = validate;

/**
 * Reusable query parameter validation middleware
 * @param {import("zod").ZodSchema} schema
 */
export const validateQuery = (schema) => {
  return async (req, res, next) => {
    try {
      const validatedData = await schema.parseAsync(req.query);
      req.query = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = {};
        for (const issue of error.issues) {
          const field = issue.path.join(".") || "general";
          if (!fieldErrors[field]) {
            fieldErrors[field] = issue.message;
          }
        }

        return res.status(400).json({
          success: false,
          message: "Query validation failed",
          errors: fieldErrors
        });
      }
      next(error);
    }
  };
};

/**
 * Reusable route parameter validation middleware
 * @param {import("zod").ZodSchema} schema
 */
export const validateParams = (schema) => {
  return async (req, res, next) => {
    try {
      const validatedData = await schema.parseAsync(req.params);
      req.params = validatedData;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors = {};
        for (const issue of error.issues) {
          const field = issue.path.join(".") || "general";
          if (!fieldErrors[field]) {
            fieldErrors[field] = issue.message;
          }
        }

        return res.status(400).json({
          success: false,
          message: "Route parameter validation failed",
          errors: fieldErrors
        });
      }
      next(error);
    }
  };
};

export default validate;
