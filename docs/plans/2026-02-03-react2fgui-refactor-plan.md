# React2FGUI Architecture Redesign Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the codebase from a monolithic regex-based parser to a modular architecture with semantic modeling, enabling support for complex FGUI components and layouts.

**Architecture:** 
- **Parser**: Converts React source into a Unified UI Tree (JSON).
- **Mapper**: Translates CSS/React semantics into FGUI-specific properties using the reference library.
- **Generator**: Produces standard FGUI XML files.

**Tech Stack:** TypeScript, XMLBuilder, fs-extra, @types/node

---

### Task 1: Define Unified Semantic Models
**Files:**
- Create: `src/models/UINode.ts`
- Create: `src/models/FGUIEnum.ts`

**Step 1: Create FGUI Enum definitions based on reverse-engineered source**
**Step 2: Create UINode interface to represent generic UI elements**
**Step 3: Commit**

### Task 2: Implement Semantic Parser (Phase 1: Tag Scanning)
**Files:**
- Create: `src/parser/ReactParser.ts`
- Modify: `src/UIPackage.ts`

**Step 1: Implement `ReactParser` class to extract tags and raw attributes**
**Step 2: Migrate existing regex logic into `ReactParser`**
**Step 3: Test with existing input.tsx**
**Step 4: Commit**

### Task 3: Implement Property Mapper
**Files:**
- Create: `src/mapper/PropertyMapper.ts`

**Step 1: Create `PropertyMapper` to convert CSS strings to FGUI attributes (XY, Size, Color)**
**Step 2: Add support for `LoaderFillType` and `Align` based on reference guide**
**Step 3: Commit**

### Task 4: Refactor Generator Layer
**Files:**
- Create: `src/generator/XMLGenerator.ts`
- Modify: `src/UIPackage.ts`

**Step 1: Move XML string building logic from `UIPackage` to `XMLGenerator`**
**Step 2: Standardize `package.xml` generation using new models**
**Step 3: Commit**

### Task 5: Integration & Verification
**Files:**
- Modify: `src/UIPackage.ts`

**Step 1: Orchestrate Parser, Mapper, and Generator in `UIPackage.exportPackage()`**
**Step 2: Run FullTestV2 to ensure zero regression**
**Step 3: Commit**
