import sql from "mssql";
import { getPool,logger } from "./db";

function rowsAffectedCount(result: any): number {
  try {
    if (!result || !result.rowsAffected) return 0;
    // rowsAffected is an array per statement; sum them
    return Array.isArray(result.rowsAffected)
      ? result.rowsAffected.reduce((a: number, b: number) => a + (b || 0), 0)
      : Number(result.rowsAffected) || 0;
  } catch {
    return 0;
  }
}

function isValidInt(id: unknown) {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

function isValidGuid(val: unknown) {
  return typeof val === "string" && val.trim().length > 0;
}


export async function deleteAdmin_User(userId: number): Promise<boolean> {
  if (!isValidInt(userId)) {
    logger.warn("deleteAdmin_User called with invalid userId", { userId });
    return false;
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("UserID", sql.Int, userId)
      .execute("sp_DeleteAdminUser");

    const deletedCount = result.returnValue || 0;
    return deletedCount > 0;
  } catch (error) {
    logger.error(" Error executing sp_DeleteAdminUser", { error, userId });
    return false;
  }
}

export async function deleteUniverse(
  universeId: string
): Promise<{ success: boolean }> {
  if (!isValidGuid(universeId)) {
    logger.warn("deleteUniverse called with invalid universeId", { universeId });
    return { success: false };
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input("UniverseID", sql.UniqueIdentifier, universeId)
      .execute("sp_DeleteUniverse"); 

    const deletedCount = result.returnValue || 0;

    return { success: deletedCount > 0 };
  } catch (error) {
    logger.error(" Error executing sp_DeleteUniverse", { error, universeId });
    return { success: false };
  }
}

export async function deleteCountry(countryId: number): Promise<{ success: boolean }> {
  if (!isValidInt(countryId)) {
    logger.warn("deleteCountry invalid id", { countryId });
    return { success: false };
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("CountryID", sql.Int, countryId)
      .execute("sp_DeleteCountry");

    const deletedRows = result.returnValue || 0;

    return { success: deletedRows > 0 };
  } catch (error) {
    logger.error(" Error deleting country", { error, countryId });
    return { success: false };
  }
}

export async function deleteState(stateId: number): Promise<{ success: boolean }> {
  if (!isValidInt(stateId)) {
    logger.warn("deleteState invalid id", { stateId });
    return { success: false };
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("StateID", sql.Int, stateId)
      .execute("sp_DeleteState");

    const deletedRows = result.returnValue || 0;

    return { success: deletedRows > 0 };
  } catch (error) {
    logger.error(" Error deleting state", { error, stateId });
    return { success: false };
  }
}

export async function deleteCity(cityId: number): Promise<{ success: boolean }> {
  if (!isValidInt(cityId)) {
    logger.warn("deleteCity invalid id", { cityId });
    return { success: false };
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("CityID", sql.Int, cityId)
      .execute("sp_DeleteCity");

    const deletedCount = result.returnValue || 0;

    return { success: deletedCount > 0 };
  } catch (error) {
    logger.error(" Error executing sp_DeleteCity", { error, cityId });
    return { success: false };
  }
}

export async function deleteCompany(companyId: number): Promise<{ success: boolean }> {
  if (!isValidInt(companyId)) {
    logger.warn("deleteCompany invalid id", { companyId });
    return { success: false };
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("CompanyID", sql.Int, companyId)
      .execute("sp_DeleteCompany");

    const rows = result.returnValue || 0;

    return { success: rows > 0 };
  } catch (error) {
    logger.error(" Error executing sp_DeleteCompany", { error });
    return { success: false };
  }
}

export async function deleteDivision(divisionId: number): Promise<{ success: boolean }> {
  if (!isValidInt(divisionId)) {
    logger.warn("deleteDivision invalid id", { divisionId });
    return { success: false };
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("DivisionID", sql.Int, divisionId)
      .execute("sp_DeleteDivision");

    const rows = result.returnValue || 0;

    return { success: rows > 0 };
  } catch (error) {
    logger.error(" Error executing sp_DeleteDivision", { error, divisionId });
    return { success: false };
  }
}

export async function deleteDepartment(departmentId: number): Promise<{ success: boolean }> {
  if (!isValidInt(departmentId)) {
    logger.warn("deleteDepartment invalid id", { departmentId });
    return { success: false };
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("DepartmentID", sql.Int, departmentId)
      .execute("sp_DeleteDepartment");

    const affected = result.returnValue || 0;

    return { success: affected > 0 };
  } catch (error) {
    logger.error(" Error executing sp_DeleteDepartment", { error, departmentId });
    return { success: false };
  }
}

export async function deleteWorkTeam(workTeamId: number): Promise<{ success: boolean }> {
  if (!isValidInt(workTeamId)) {
    logger.warn("deleteWorkTeam invalid id", { workTeamId });
    return { success: false };
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("WorkTeamID", sql.Int, workTeamId)
      .execute("sp_DeleteWorkTeam");

    const deleted = result.returnValue || 0;

    return { success: deleted > 0 };
  } catch (error) {
    logger.error(" Error executing sp_DeleteWorkTeam", { error, workTeamId });
    return { success: false };
  }
}

export async function deleteLanguage(languageId: number): Promise<{ success: boolean }> {
  if (!isValidInt(languageId)) {
    logger.warn("deleteLanguage invalid id", { languageId });
    return { success: false };
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input("LanguageID", sql.Int, languageId)
      .execute("sp_DeleteLanguage");

    const deleted = result.returnValue || 0;

    return { success: deleted > 0 };
  } catch (error) {
    logger.error(" Error executing sp_DeleteLanguage", { error, languageId });
    return { success: false };
  }
}

export async function deleteTranslation(translationId: number): Promise<{ success: boolean }> {
  if (!isValidInt(translationId)) {
    logger.warn("deleteTranslation invalid id", { translationId });
    return { success: false };
  }
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input("TranslationID", sql.Int, translationId)
      .execute("sp_DeleteTranslation");

    const deleted = result.returnValue || 0;

    return { success: deleted > 0 };
  } catch (error) {
    logger.error("Error executing sp_DeleteTranslation", { error, translationId });
    return { success: false };
  }
}

export async function deleteComponent(
  ui_component_id: number,
  component_name: string
): Promise<{ success: boolean }> {

  if (!isValidInt(ui_component_id) || typeof component_name !== "string" || component_name.trim() === "") {
    logger.warn("deleteComponent invalid params", { ui_component_id, component_name });
    return { success: false };
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input("ui_component_id", sql.Int, ui_component_id)
      .input("component_name", sql.NVarChar(255), component_name.trim())
      .execute("sp_DeleteComponent");

    const deleted = result.returnValue || 0;

    return { success: deleted > 0 };

  } catch (error) {
    logger.error("Error executing sp_DeleteComponent", { error, ui_component_id, component_name });
    return { success: false };
  }
}

export async function deleteUITranslationById(translationId: number): Promise<{ success: boolean }> {
  if (!isValidInt(translationId)) {
    logger.warn("deleteUITranslationById invalid id", { translationId });
    return { success: false };
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input("TranslationID", sql.Int, translationId)
      .execute("sp_DeleteUITranslation");

    const deleted = result.returnValue || 0;

    return { success: deleted > 0 };

  } catch (error) {
    logger.error("Error executing sp_DeleteUITranslation", { error, translationId });
    return { success: false };
  }
}

export async function deleteAssetById(assetId: number): Promise<{ success: boolean }> {
  if (!isValidInt(assetId)) {
    logger.warn("deleteAssetById invalid id", { assetId });
    return { success: false };
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("AssetID", sql.Int, assetId)
      .execute("sp_DeleteAsset");

    const affected = result.returnValue || 0;

    return { success: affected > 0 };
  } catch (error) {
    logger.error("Error executing sp_DeleteAsset", { error, assetId });
    return { success: false };
  }
}

export async function deleteRoleById(roleId: number): Promise<{ success: boolean }> {
  if (!isValidInt(roleId)) {
    logger.warn("deleteRoleById invalid id", { roleId });
    return { success: false };
  }

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input("RoleID", sql.Int, roleId)
      .execute("sp_DeleteRole");

    const deleted = result.returnValue || 0;

    return { success: deleted > 0 };
  } catch (error) {
    logger.error("Error executing sp_DeleteRole", { error, roleId });
    return { success: false };
  }
}

export async function deleteAsset(assetId: number): Promise<{ success: boolean }> {
  if (!isValidInt(assetId)) {
    logger.warn("deleteAsset invalid id", { assetId });
    return { success: false };
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("AssetID", sql.Int, assetId)
      .execute("sp_DeleteSystemAsset");

    const deleted = result.returnValue || 0;

    return { success: deleted > 0 };

  } catch (error) {
    logger.error("Error executing sp_DeleteSystemAsset", { error, assetId });
    return { success: false };
  }
}

export const DeleteFunctions = {
  deleteAdmin_User,
  deleteUniverse,
  deleteCountry,
  deleteState,
  deleteCity,
  deleteCompany,
  deleteDivision,
  deleteDepartment,
  deleteWorkTeam,
  deleteLanguage,
  deleteTranslation,
  deleteComponent,
  deleteUITranslationById,
  deleteAssetById,
  deleteRoleById,
  deleteAsset
};