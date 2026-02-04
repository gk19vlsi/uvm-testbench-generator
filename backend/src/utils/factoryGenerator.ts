/**
 * Factory Registration Generator
 * Generates UVM factory registration macros and override examples
 */

/**
 * Component type for factory registration
 */
export type ComponentType =
  | "component"
  | "object"
  | "component_param"
  | "object_param";

/**
 * Factory registration configuration
 */
export interface FactoryRegistration {
  className: string;
  componentType: ComponentType;
  parameterType?: string; // For parameterized components
}

/**
 * Generate factory registration macro
 */
export function generateFactoryMacro(
  registration: FactoryRegistration,
): string {
  switch (registration.componentType) {
    case "component":
      return `  \`uvm_component_utils(${registration.className})`;

    case "object":
      return `  \`uvm_object_utils(${registration.className})`;

    case "component_param":
      if (!registration.parameterType) {
        throw new Error("Parameter type required for parameterized component");
      }
      return `  \`uvm_component_param_utils(${registration.className}#(${registration.parameterType}))`;

    case "object_param":
      if (!registration.parameterType) {
        throw new Error("Parameter type required for parameterized object");
      }
      return `  \`uvm_object_param_utils(${registration.className}#(${registration.parameterType}))`;

    default:
      return `  \`uvm_component_utils(${registration.className})`;
  }
}

/**
 * Generate factory override example comment
 */
export function generateFactoryOverrideExample(
  baseClassName: string,
  componentType: ComponentType,
): string {
  const exampleClassName = `${baseClassName}_extended`;

  if (componentType === "component" || componentType === "component_param") {
    return `
  // Factory override example:
  // To override this component with a derived version:
  //   ${baseClassName}::type_id::set_type_override(${exampleClassName}::get_type());
  // Or use instance override:
  //   set_inst_override_by_type("path.to.${baseClassName.toLowerCase()}", 
  //                              ${baseClassName}::get_type(),
  //                              ${exampleClassName}::get_type());`;
  } else {
    return `
  // Factory override example:
  // To override this object with a derived version:
  //   ${baseClassName}::type_id::set_type_override(${exampleClassName}::get_type());`;
  }
}

/**
 * Determine component type from class characteristics
 */
export function determineComponentType(
  className: string,
  extendsClass: string,
  isParameterized: boolean = false,
): ComponentType {
  // Check if it's a UVM component (extends uvm_component or its derivatives)
  const componentClasses = [
    "uvm_component",
    "uvm_driver",
    "uvm_monitor",
    "uvm_agent",
    "uvm_env",
    "uvm_test",
    "uvm_scoreboard",
    "uvm_sequencer",
  ];

  // Check if it's a UVM object (extends uvm_object or its derivatives)
  const objectClasses = [
    "uvm_object",
    "uvm_sequence_item",
    "uvm_sequence",
    "uvm_transaction",
  ];

  const isComponent = componentClasses.some((c) => extendsClass.includes(c));
  const isObject = objectClasses.some((c) => extendsClass.includes(c));

  if (isComponent) {
    return isParameterized ? "component_param" : "component";
  } else if (isObject) {
    return isParameterized ? "object_param" : "object";
  }

  // Default to component
  return "component";
}

/**
 * Generate factory registration for a component
 */
export function generateComponentFactoryRegistration(
  className: string,
  extendsClass: string,
  parameterType?: string,
): string {
  const isParameterized = !!parameterType;
  const componentType = determineComponentType(
    className,
    extendsClass,
    isParameterized,
  );

  const registration: FactoryRegistration = {
    className,
    componentType,
    parameterType,
  };

  const macro = generateFactoryMacro(registration);
  const example = generateFactoryOverrideExample(className, componentType);

  return `${macro}\n${example}`;
}

/**
 * Generate factory registration for all components in a testbench
 */
export function generateTestbenchFactoryRegistrations(
  components: Array<{
    className: string;
    extendsClass: string;
    parameterType?: string;
  }>,
): Map<string, string> {
  const registrations = new Map<string, string>();

  for (const component of components) {
    const registration = generateComponentFactoryRegistration(
      component.className,
      component.extendsClass,
      component.parameterType,
    );
    registrations.set(component.className, registration);
  }

  return registrations;
}

/**
 * Generate factory override setup in test class
 */
export function generateTestFactoryOverrides(
  overrides: Array<{
    baseName: string;
    overrideName: string;
    instancePath?: string;
  }>,
): string {
  if (overrides.length === 0) {
    return "    // No factory overrides";
  }

  return overrides
    .map((override) => {
      if (override.instancePath) {
        // Instance-specific override
        return `    set_inst_override_by_type("${override.instancePath}",
                                  ${override.baseName}::get_type(),
                                  ${override.overrideName}::get_type());`;
      } else {
        // Type override (affects all instances)
        return `    ${override.baseName}::type_id::set_type_override(${override.overrideName}::get_type());`;
      }
    })
    .join("\n");
}

/**
 * Check if a class needs factory registration
 */
export function needsFactoryRegistration(className: string): boolean {
  // Classes that don't need factory registration
  const excludedPrefixes = ["uvm_", "std_"];
  const excludedSuffixes = ["_pkg", "_if"];

  for (const prefix of excludedPrefixes) {
    if (className.startsWith(prefix)) {
      return false;
    }
  }

  for (const suffix of excludedSuffixes) {
    if (className.endsWith(suffix)) {
      return false;
    }
  }

  return true;
}

/**
 * Extract parameter type from parameterized class
 */
export function extractParameterType(
  classDeclaration: string,
): string | undefined {
  // Match pattern like: class my_class #(type T = int)
  const paramMatch = classDeclaration.match(/#\s*\(\s*(?:type\s+)?(\w+)/);
  return paramMatch ? paramMatch[1] : undefined;
}
