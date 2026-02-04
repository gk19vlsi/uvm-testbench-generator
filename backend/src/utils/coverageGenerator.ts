/**
 * Coverage Model Generator
 * Generates SystemVerilog covergroups from specification coverage goals
 */

import { toUpperSnakeCase } from "./templateEngine";

/**
 * Coverage goal from specification
 */
export interface CoverageGoal {
  name: string;
  description: string;
  signals: string[];
  crossCoverage?: Array<{
    signals: string[];
    description: string;
  }>;
  bins?: Array<{
    name: string;
    values: string[];
    illegal?: boolean;
  }>;
}

/**
 * Generated covergroup code
 */
export interface CovergroupCode {
  name: string;
  declaration: string;
  instantiation: string;
  sampling: string;
}

/**
 * Generate covergroup from coverage goal
 */
export function generateCovergroup(
  goal: CoverageGoal,
  transactionType: string,
  agentName: string,
): CovergroupCode {
  const covergroupName = `${agentName}_cg`;
  const covergroupNameUpper = toUpperSnakeCase(covergroupName);

  // Generate coverpoints
  const coverpoints = goal.signals
    .map((signal) => {
      const bins = goal.bins?.filter((b) => b.name.includes(signal)) || [];

      let binsCode = "";
      if (bins.length > 0) {
        binsCode = bins
          .map((bin) => {
            if (bin.illegal) {
              return `      illegal_bins ${bin.name} = {${bin.values.join(", ")}};`;
            } else {
              return `      bins ${bin.name} = {${bin.values.join(", ")}};`;
            }
          })
          .join("\n");
      } else {
        // Auto-generate bins
        binsCode = `      bins ${signal}_bins[] = {[0:$]};`;
      }

      return `    ${signal}_cp: coverpoint trans.${signal} {
${binsCode}
    }`;
    })
    .join("\n\n");

  // Generate cross coverage
  let crossCoverage = "";
  if (goal.crossCoverage && goal.crossCoverage.length > 0) {
    crossCoverage = goal.crossCoverage
      .map((cross, idx) => {
        const crossName = `cross_${idx + 1}`;
        const coverpoints = cross.signals.map((s) => `${s}_cp`).join(", ");
        return `    ${crossName}: cross ${coverpoints};`;
      })
      .join("\n");
  }

  // Generate covergroup declaration
  const declaration = `
  // Coverage group for ${goal.description}
  covergroup ${covergroupName};
    option.per_instance = 1;
    option.name = "${covergroupName}";
    option.comment = "${goal.description}";

${coverpoints}

${crossCoverage ? "\n" + crossCoverage : ""}
  endgroup : ${covergroupName}`;

  // Generate instantiation code
  const instantiation = `    ${covergroupName} = new();`;

  // Generate sampling code
  const sampling = `      ${covergroupName}.sample();`;

  return {
    name: covergroupName,
    declaration,
    instantiation,
    sampling,
  };
}

/**
 * Generate multiple covergroups for an agent
 */
export function generateAgentCovergroups(
  goals: CoverageGoal[],
  transactionType: string,
  agentName: string,
): {
  declarations: string;
  instantiations: string;
  samplings: string;
} {
  const covergroups = goals.map((goal) =>
    generateCovergroup(goal, transactionType, agentName),
  );

  return {
    declarations: covergroups.map((cg) => cg.declaration).join("\n\n"),
    instantiations: covergroups.map((cg) => cg.instantiation).join("\n"),
    samplings: covergroups.map((cg) => cg.sampling).join("\n"),
  };
}

/**
 * Generate default coverage goals from signals
 */
export function generateDefaultCoverageGoals(
  signals: string[],
  agentName: string,
): CoverageGoal[] {
  return [
    {
      name: `${agentName}_basic_coverage`,
      description: `Basic signal coverage for ${agentName}`,
      signals: signals,
      crossCoverage: [],
      bins: [],
    },
  ];
}

/**
 * Extract coverage goals from specification data
 */
export function extractCoverageGoals(
  specificationData: any,
  agentName: string,
): CoverageGoal[] {
  // If specification has explicit coverage goals, use them
  if (
    specificationData.coverageGoals &&
    specificationData.coverageGoals.length > 0
  ) {
    return specificationData.coverageGoals
      .filter((goal: any) => goal.agent === agentName || !goal.agent)
      .map((goal: any) => ({
        name: goal.name || `${agentName}_coverage`,
        description: goal.description || `Coverage for ${agentName}`,
        signals: goal.signals || [],
        crossCoverage: goal.crossCoverage || [],
        bins: goal.bins || [],
      }));
  }

  // Otherwise, return empty array (will use default coverage)
  return [];
}
