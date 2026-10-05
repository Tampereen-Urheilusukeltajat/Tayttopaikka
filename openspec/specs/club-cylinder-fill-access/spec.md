# Spec: Club Cylinder Fill Access

## Purpose

Users and blenders with no personal cylinder sets of their own are not blocked from filling gas into club cylinder sets. The regular (air-fill) and blender (gas-fill) logbook forms render whenever a club cylinder set is available, even in the absence of any personal cylinder sets.

---

## Requirements

### Requirement: Regular logbook form renders for users with only club cylinder sets available

The regular (air-fill) logbook view SHALL render the new fill event form when the user has at least one personal cylinder set OR at least one club cylinder set available, in addition to the existing compressor data requirement. A user with zero personal cylinder sets SHALL NOT be blocked from filling club cylinder sets.

#### Scenario: User has no personal cylinder sets but club cylinder sets exist
- **WHEN** a user with zero personal cylinder sets opens the regular logbook view, and at least one club cylinder set exists
- **THEN** the fill event form renders, with the club cylinder picker available via the "Näytä seuran pullot" toggle

#### Scenario: User has personal cylinder sets, no club cylinder sets exist
- **WHEN** a user with at least one personal cylinder set opens the regular logbook view, and zero club cylinder sets exist
- **THEN** the fill event form renders as before, with no club cylinder toggle shown

#### Scenario: User has neither personal nor club cylinder sets
- **WHEN** a user with zero personal cylinder sets opens the regular logbook view, and zero club cylinder sets exist
- **THEN** the fill event form does not render, and the user sees a message that there is no cylinder set available to fill

---

### Requirement: Blender logbook form renders for blenders with only club cylinder sets available

The blender logbook (gas-fill) view SHALL render the new fill event form when the user has at least one personal cylinder set OR at least one club cylinder set available, in addition to the existing storage cylinder and gas data requirements. A blender with zero personal cylinder sets SHALL NOT be blocked from filling club cylinder sets.

#### Scenario: Blender has no personal cylinder sets but club cylinder sets exist
- **WHEN** a blender with zero personal cylinder sets opens the blender logbook view, storage cylinders and gases are configured, and at least one club cylinder set exists
- **THEN** the fill event form renders, with the club cylinder picker available

#### Scenario: Blender has neither personal nor club cylinder sets
- **WHEN** a blender with zero personal cylinder sets opens the blender logbook view, and zero club cylinder sets exist
- **THEN** the fill event form does not render, and the blender sees a message that there is no cylinder set available to fill

#### Scenario: Storage cylinders or gases still missing
- **WHEN** a blender has personal or club cylinder sets available, but no storage cylinders or no gases are configured
- **THEN** the fill event form does not render, unchanged from current behavior
