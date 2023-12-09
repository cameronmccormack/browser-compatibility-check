import { getAllCssFiles } from './css-finder/get-all-css-files';
import * as csstree from 'css-tree';
import { getFormattedCss } from './css-parser/css-parser';
import { getCompatibilityReport } from './compatibility-report/get-compatibility-report';
import { CompatibilityReport } from './types/compatibility';
import { printCompatibilityReports } from './compatibility-report/print-compatibility-reports';
import { getValidatedBrowserConfig } from './schema-validation/browsers';
import { getBrowserConfig } from './get-browser-config';

export enum ExitCode {
  Compatible = 0,
  Incompatible = 1,
  BadArgsOrException = 2,
}

export const runCli = (
  exitWith: (code: ExitCode, errorMessage?: string) => ExitCode,
  relativePath?: string,
): ExitCode => {
  const rawBrowserConfig = getBrowserConfig();
  const validatedBrowserConfig = getValidatedBrowserConfig(rawBrowserConfig);

  if (!Array.isArray(validatedBrowserConfig)) {
    return exitWith(2, `Error: ${validatedBrowserConfig.error}`);
  }

  const currentWorkingDirectory = process.cwd();
  const formattedPath = relativePath?.replaceAll(/\/+$|^\.\//g, '');
  const absolutePath = `${currentWorkingDirectory}${
    formattedPath ? `/${formattedPath}` : ''
  }`;

  const cssFiles = getAllCssFiles(absolutePath);
  if (cssFiles === null) {
    return exitWith(2, `Error: Invalid filepath: ${absolutePath}.`);
  }
  if (cssFiles.length === 0) {
    return exitWith(1, `Error: No CSS files found.`);
  }

  const reports: CompatibilityReport[] = [];
  cssFiles.forEach((file) => {
    const formattedCss = getFormattedCss(csstree.parse(file.contents));
    reports.push(
      getCompatibilityReport(
        formattedCss,
        validatedBrowserConfig,
        file.path.replace(currentWorkingDirectory, '.'),
      ),
    );
  });

  printCompatibilityReports(reports);

  return reports.some((report) => report.overallStatus === 'fail')
    ? exitWith(1)
    : exitWith(0);
};
