import { resolve, sep } from "path";

function resolveAppPath() {
  if (process.env.APP_ROOT_PATH) {
    return resolve(process.env.APP_ROOT_PATH);
  }
  if (process.env.LAMBDA_TASK_ROOT && process.env.AWS_EXECUTION_ENV) {
		return process.env.LAMBDA_TASK_ROOT;
  }
  const resolved = resolve(__dirname);

  const nodeModulesDir = sep + "node_modules";

	if (resolved.includes(nodeModulesDir)) {
		return resolved.split(nodeModulesDir)[0];
	}

  return process.cwd();
}

export const appRootPath = resolveAppPath();
