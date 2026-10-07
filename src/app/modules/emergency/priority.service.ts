import {
  EmergencyPriority,
  EmergencyType,
} from "../../../../generated/prisma/enums";

const HIGH_RISK_KEYWORDS = [
  "cardiac arrest",
  "unconscious",
  "not breathing",
  "severe bleeding",
  "stroke",
  "chest pain",
  "major accident",
  "cardiac",
  "trauma",
  "unresponsive",
  "choking",
  "head injury",
];

const MEDIUM_RISK_KEYWORDS = [
  "difficulty breathing",
  "shortness of breath",
  "burn",
  "fracture",
  "asthma",
  "diabetic",
  "seizure",
  "allergic reaction",
  "pregnancy",
  "labor",
];

/**
 * Heuristic priority suggestion. The caller may override it; we never blindly
 * trust the client-provided priority but we also don't pretend to be a
 * medical triage system.
 */
export const suggestPriority = (
  type: EmergencyType,
  description?: string,
): EmergencyPriority => {
  const text = (description ?? "").toLowerCase();

  if (HIGH_RISK_KEYWORDS.some((k) => text.includes(k))) {
    return EmergencyPriority.CRITICAL;
  }

  if (MEDIUM_RISK_KEYWORDS.some((k) => text.includes(k))) {
    return EmergencyPriority.HIGH;
  }

  switch (type) {
    case EmergencyType.CARDIAC:
    case EmergencyType.STROKE:
    case EmergencyType.TRAUMA:
      return EmergencyPriority.CRITICAL;
    case EmergencyType.RESPIRATORY:
    case EmergencyType.OBSTETRIC:
    case EmergencyType.PEDIATRIC:
    case EmergencyType.BURN:
    case EmergencyType.ACCIDENT:
      return EmergencyPriority.HIGH;
    case EmergencyType.POISONING:
    case EmergencyType.GENERAL_MEDICAL:
      return EmergencyPriority.MEDIUM;
    default:
      return EmergencyPriority.LOW;
  }
};