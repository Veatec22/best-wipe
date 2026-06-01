import type {
  BranchDefinition,
  ReportValidatorRule,
  TaskDefinition,
  ValidatorRule,
} from "./taskTypes";

interface DefaultBranchInput {
  validators: ValidatorRule[];
  reportValidators?: ReportValidatorRule[];
  successReply: string;
  factsOnSuccess?: BranchDefinition["factsOnSuccess"];
}

export function defaultBranch(input: DefaultBranchInput): BranchDefinition {
  return {
    match: {
      id: "default",
      comment: "Catch-all branch for tasks without narrative branching.",
      check: () => true,
    },
    validators: input.validators,
    reportValidators: input.reportValidators,
    successReply: input.successReply,
    factsOnSuccess: input.factsOnSuccess,
  };
}

export function defineTask(task: TaskDefinition): TaskDefinition {
  return task;
}
