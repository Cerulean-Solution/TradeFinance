import { executeQuery, executeStoredProcedure } from "./db";
import { v4 as uuidv4 } from "uuid";

export interface Universe {
  UniverseID: String;
  UniverseName: string;
  Description?: string;
  IsActive: boolean;
  CreatedDate: Date;
  ModifiedDate?: Date;
}
export interface AdminUser {
  UserID: number;
  UniverseID: number;
  Username: string;
  Email: string;
  PasswordHash: string;
  Status: string;
  CreatedBy: string;
  LastLogin?: string | null;
  Role: string;
}
interface Language {
  LanguageID?: number;
  LanguageCode: string;
  LanguageName: string;
  NativeLanguage?: string;
  Direction: "LTR" | "RTL";
  UniverseID: string;
  IsActive?: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
}
export interface Translation {
  id: number; // Primary key
  key: string; // Translation key
  en: string; // English translation
  ar?: string | null; // Arabic translation (optional)
  es?: string | null; // Spanish translation (optional)
  CreatedAt?: string; // Optional timestamp
  UpdatedAt?: string; // Optional timestamp
}
export interface Country {
  CountryID: number;
  CountryName: string;
  CountryCode: string;
  ISO2Code?: string;
  ISO3Code?: string;
  CountryNumeric?: string;
  PhoneCode?: string;
  Capital?: string;
  CurrencyCode?: string;
  CurrencyName?: string;
  TLD?: string;
  Region?: string;
  RegionID?: number;
  SubRegion?: string;
  SubRegionID?: number;
  Nationality?: string;
  Timezones?: string;
  Latitude?: number;
  Longitude?: number;
  IsActive?: boolean;
  UniverseID: string | null;
  CreatedAt?: string;
  UpdatedAt?: string;
}
type CountryWithUniverse = Country & {
  UniverseName?: string | null;
};
interface State {
  StateID: number;
  StateName: string;
  StateCode: string;
  StateType?: string;
  CountryID: number;
  CountryCode?: string;
  CountryName?: string;
  Latitude?: number;
  Longitude?: number;
  UniverseID: string | null;
  IsActive: boolean;
  CreatedAt: string;
  UpdatedAt?: string;
}
type City = {
  CityID?: number;
  CityName: string;
  StateID: number;
  StateName: string;
  CountryID: number;
  CountryName: string;
  PostalCode?: string;
  Latitude?: number;
  Longitude?: number;
  WikiDataID?: string;
  UniverseID?: string | null;
  IsActive?: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
};
export interface Company {
  UniverseID?: string;
  CompanyID: number;
  CompanyName: string;
  CompanyCode: string;
  CityName: string;
  Address?: string;
  CityID?: number;
  Phone?: string;
  Email?: string;
  Website?: string;
  IsActive: boolean;
  CreatedDate: Date;
}
export type CompanyWithUniverse = Company & {
  UniverseName?: string | null;
};
export interface Division {
  DivisionID: number;
  CompanyID: number;
  CompanyName: string;
  DivisionName: string;
  DivisionCode: string;
  Description?: string;
  IsActive: boolean;
  CreatedDate: Date;
}
export interface Department {
  CompanyName: string;
  DivisionName: string;
  CompanyID: number;
  DepartmentID: number;
  DivisionID: number;
  DepartmentName: string;
  DepartmentCode: string;
  Description?: string;
  IsActive: boolean;
  CreatedDate: Date;
}
export interface WorkTeam {
  WorkTeamID: number;
  DepartmentID: number;
  WorkTeamName: string;
  WorkTeamCode: string;
  Description?: string;
  IsActive: boolean;
  CreatedDate: Date;
}
export interface HeaderComponent {
  ui_component_id: number;
  component: string;
  component_name: string;
  created_at: string;
  updated_at: string;
}
export interface AssetFormValues {
  Actions: string;
  AssetID?: number;
  AssetName: string;
  AssetType: string;
  AssetDescription?: string;
  IsActive: boolean;
  AssetOwner?: string;
  Priority?: string;
  environment?: string;
  Uptime?: number;
  UniverseID?: string;
  Alerts?: number;
}
export interface ConfigurationFormValues {
  BackupFrequency?: string;
  DataRetention?: string;
  MaintenanceWindow?: string;
  MaxConnections?: number;
  Timeout?: number;
  AutoBackup?: boolean;
  AccessLogging?: boolean;
  AlertsEnabled?: boolean;
  Encryption?: boolean;
  ConfigurationNotes?: string;
}
export interface Alert {
  id: number;
  type: "Error" | "Warning" | "Info";
  message: string;
  timestamp: string;
}
export interface AssetMonitoring {
  AssetID: number;
  AssetName: string;
  Uptime: number;
  ResponseTime: number;
  ActiveConnections: number;
  ErrorRate: number;
  CPUUsage: number;
  MemoryUsage: number;
  DiskUsage: number;
  NetworkIO: number;
  LastHealthCheck: string;
  Alerts: Alert[];
}
export interface Role {
  Id: number;
  Assets: String;
  Role: string;
  Description: string | null;
  Permissions: string | null;
  CreatedAt?: string;
  UpdatedAt?: string;
  AssetName: string;
}
export type AccessLog = {
  LogID: number;
  Timestamp: string;
  Role: string;
  Asset: string;
  Action: string;
  Status: "Success" | "Denied";
  IPAddress: string;
  Details: string;
  UniverseID: string;
};
export interface Currency {
  CurrencyID: number;
  CurrencyCode: string;
  CurrencyName: string;
  Symbol?: string;
  Country?: string;
  DecimalPlaces: number;
  IsActive: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
}

export function safeString(value: any): string | null {
  if (value === undefined || value === null) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}
const safeDate = (value?: any) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`; 
};
const safeDateTime = (value?: any) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
};
const safeInt = (value: any) =>
  value !== undefined && value !== null && !isNaN(Number(value))
    ? Number(value)
    : null;

export interface ComponentData {
  component: string;
  component_name: string;
  componentType?: ComponentType;
}
type ComponentType = "heading";
export class FrameworkService {
  //----------------------------------- User Management-------------------------------------
  async getAdminUsers(): Promise<AdminUser[]> {
    try {
      return await executeStoredProcedure<AdminUser>("sp_GetUsers", {});
    } catch (err) {
      throw new Error("Database error while fetching admin users.");
    }
  }
  async insertAdminUser(data: any) {
    if (
      !data.Username ||
      !data.Email ||
      !data.PasswordHash ||
      !data.UniverseID
    ) {
      throw new Error(
        "UniverseID, Username, Email, and PasswordHash are required."
      );
    }

    try {
      return executeStoredProcedure("sp_InsertUserManagement", {
        UniverseID: data.UniverseID,
        UserType: data.UserType ?? null,
        Username: data.Username,
        Email: data.Email,

        DateOfBirth: safeDate(data.DateOfBirth),
        HireDate: safeDate(data.HireDate),
        TerminationDate: safeDate(data.TerminationDate),

        // DATETIME2 fields
        PasswordUpdatedAt: safeDateTime(data.PasswordUpdatedAt),
        DelegationStartDate: safeDateTime(data.DelegationStartDate),
        DelegationEndDate: safeDateTime(data.DelegationEndDate),
        LastLoginAt: safeDateTime(data.LastLoginAt),

        //  Remaining fields (unchanged)
        PrimaryRole: data.PrimaryRole ?? null,
        RoleTags: data.RoleTags ?? null,
        Department: data.Department ?? null,
        Designation: data.Designation ?? null,
        FirstName: data.FirstName ?? null,
        LastName: data.LastName ?? null,
        DisplayName: data.DisplayName ?? null,
        Gender: data.Gender ?? null,
        PhoneNumber: data.PhoneNumber ?? null,
        AlternatePhone: data.AlternatePhone ?? null,
        AddressLine1: data.AddressLine1 ?? null,
        AddressLine2: data.AddressLine2 ?? null,
        City: data.City ?? null,
        State: data.State ?? null,
        Country: data.Country ?? null,
        PostalCode: data.PostalCode ?? null,
        AuthType: data.AuthType ?? "Local",
        PasswordHash: data.PasswordHash,
        ExternalAuthProvider: data.ExternalAuthProvider ?? null,
        ExternalAuthID: data.ExternalAuthID ?? null,
        AuthMetadata: data.AuthMetadata ?? null,
        IsSupervisor: data.IsSupervisor ? 1 : 0,
        IsManager: data.IsManager ? 1 : 0,
        ManagementLevel: data.ManagementLevel ?? null,
        SupervisorUserID: safeInt(data.SupervisorUserID),
        ManagerUserID: safeInt(data.ManagerUserID),
        DirectReportsCount: safeInt(data.DirectReportsCount) ?? 0,
        IsDelegated: data.IsDelegated ? 1 : 0,
        DelegatedToUserID: safeInt(data.DelegatedToUserID),
        DelegatedByUserID: safeInt(data.DelegatedByUserID),
        DelegationReason: data.DelegationReason ?? null,
        EmploymentType: data.EmploymentType ?? null,
        EmploymentStatus: data.EmploymentStatus ?? null,
        IsActive: data.IsActive ? 1 : 0,
        IsDeleted: data.IsDeleted ? 1 : 0,
        CreatedBy: data.CreatedBy ?? "System",
      });
    } catch (error) {
      throw new Error("Failed to update admin user.");
    }
  }
  async updateAdminUser(data: any) {
    if (!data.UserID && data.UserID !== 0) {
      throw new Error("UserID is required for update.");
    }

    //  Helper: Format SQL DATE (no time)
    const safeDate = (value?: any) => {
      if (!value) return null;
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
    };

    // Helper: Format SQL DATETIME (full timestamp)
    const safeDateTime = (value?: any) => {
      if (!value) return null;
      const d = new Date(value);
      if (isNaN(d.getTime())) return null;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")} ${String(
        d.getHours()
      ).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(
        d.getSeconds()
      ).padStart(2, "0")}`;
    };

    const safeInt = (value: any) =>
      value !== undefined && value !== null && !isNaN(Number(value))
        ? Number(value)
        : null;

    //  If password is being updated, set current timestamp for PasswordUpdatedAt
    let passwordUpdatedAt = data.PasswordUpdatedAt;
    if (data.PasswordHash) {
      const nowIST = new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });
      const now = new Date(nowIST);
      passwordUpdatedAt = `${now.getFullYear()}-${String(
        now.getMonth() + 1
      ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(
        now.getHours()
      ).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(
        now.getSeconds()
      ).padStart(2, "0")}`;
    }

    return executeStoredProcedure("sp_UpdateUserManagement", {
      UserID: Number(data.UserID),
      UniverseID: data.UniverseID ?? null,
      UserType: data.UserType ?? null,
      Username: data.Username,
      Email: data.Email,
      PrimaryRole: data.PrimaryRole ?? null,
      RoleTags: data.RoleTags ?? null,
      Department: data.Department ?? null,
      Designation: data.Designation ?? null,
      FirstName: data.FirstName ?? null,
      LastName: data.LastName ?? null,
      DisplayName: data.DisplayName ?? null,
      Gender: data.Gender ?? null,

      DateOfBirth: safeDate(data.DateOfBirth),
      HireDate: safeDate(data.HireDate),
      TerminationDate: safeDate(data.TerminationDate),

      PhoneNumber: data.PhoneNumber ?? null,
      AlternatePhone: data.AlternatePhone ?? null,
      AddressLine1: data.AddressLine1 ?? null,
      AddressLine2: data.AddressLine2 ?? null,
      City: data.City ?? null,
      State: data.State ?? null,
      Country: data.Country ?? null,
      PostalCode: data.PostalCode ?? null,

      AuthType: data.AuthType ?? "Local",
      PasswordHash: data.PasswordHash ?? null,

      //  Automatically update timestamp when password changes
      PasswordUpdatedAt: passwordUpdatedAt
        ? safeDateTime(passwordUpdatedAt)
        : null,

      DelegationStartDate: safeDateTime(data.DelegationStartDate),
      DelegationEndDate: safeDateTime(data.DelegationEndDate),
      LastLoginAt: safeDateTime(data.LastLoginAt),

      ExternalAuthProvider: data.ExternalAuthProvider ?? null,
      ExternalAuthID: data.ExternalAuthID ?? null,
      AuthMetadata: data.AuthMetadata ?? null,

      IsSupervisor: data.IsSupervisor ? 1 : 0,
      IsManager: data.IsManager ? 1 : 0,
      ManagementLevel: data.ManagementLevel ?? null,
      SupervisorUserID: safeInt(data.SupervisorUserID),
      ManagerUserID: safeInt(data.ManagerUserID),
      DirectReportsCount: safeInt(data.DirectReportsCount) ?? 0,

      IsDelegated: data.IsDelegated ? 1 : 0,
      DelegatedToUserID: safeInt(data.DelegatedToUserID),
      DelegatedByUserID: safeInt(data.DelegatedByUserID),
      DelegationReason: data.DelegationReason ?? null,

      EmploymentType: data.EmploymentType ?? null,
      EmploymentStatus: data.EmploymentStatus ?? null,

      IsActive: data.IsActive ? 1 : 0,
      IsDeleted: data.IsDeleted ? 1 : 0,
      UpdatedBy: data.UpdatedBy ?? "System",
    });
  }

  // ---------------------------------- localization----------------------------------------
  // languages
  async getLanguages(): Promise<Language[]> {
    try {
      return await executeStoredProcedure<Language>("sp_GetLanguages", {});
    } catch (err) {
      throw new Error("Database error while fetching languages.");
    }
  }
  async insertLanguage(
    language: Omit<Language, "LanguageID" | "CreatedAt" | "UpdatedAt">
  ): Promise<Language[]> {
    try {
      return executeStoredProcedure<Language>("sp_InsertLanguageWithUniverse", {
        LanguageCode: language.LanguageCode,
        LanguageName: language.LanguageName,
        NativeLanguage: language.NativeLanguage ?? null,
        Direction: language.Direction,
        IsActive: language.IsActive ?? true,
        UniverseID: language.UniverseID || null,
      });
    } catch (err) {
      throw new Error("Failed to insert language.");
    }
  }
  async updateLanguage(
    languageId: number,
    language: Partial<Language>
  ): Promise<Language[]> {
    try {
      return executeStoredProcedure<Language>("sp_UpdateLanguageWithUniverse", {
        LanguageID: languageId,
        LanguageCode: language.LanguageCode ?? null,
        LanguageName: language.LanguageName ?? null,
        NativeLanguage: language.NativeLanguage ?? null,
        Direction: language.Direction ?? null,
        IsActive: language.IsActive ?? true,
        UniverseID: language.UniverseID || null,
      });
    } catch (err) {
      throw new Error("Failed to update language.");
    }
  }

  // Translations
  async getUITranslations(): Promise<
    {
      UI_Translation_id: number;
      UI_Translation_name: string;
      CreatedAt: string;
      UpdatedAt: string;
    }[]
  > {
    try {
      return await executeStoredProcedure("sp_GetUITranslations", {});
    } catch (err) {
      throw new Error("Database error while fetching UI translations.");
    }
  }
  async insertUITranslation(data: { UI_Translation_name: string }) {
    // ---- Input Validation ----
    const name = safeString(data.UI_Translation_name);
    if (!name) {
      throw new Error("UI Translation Name is required.");
    }

    try {
      // ---- Safe Stored Procedure Call ----
      return await executeStoredProcedure("sp_UITranslation", {
        UI_Translation_name: name, // sanitized
      });
    } catch (err) {
      throw new Error("Failed to insert UI translation.");
    }
  }

  // component
  async getTranslation(): Promise<Translation[]> {
    try {
      return await executeStoredProcedure<Translation>(
        "sp_GetTranslations",
        {}
      );
    } catch (err) {
      throw new Error("Database error while fetching translations.");
    }
  }
  async insertTranslation(data: {
    key: string;
    en: string;
    ar?: string | null;
    es?: string | null;
    IsActive?: boolean;
  }) {
    if (!data?.key || !data?.en) {
      throw new Error("Translation key and English text are required.");
    }

    try {
      const result = await executeStoredProcedure("sp_InsertTranslation", {
        TranslationKey: data.key,
        EnglishText: data.en,
        ArabicText: data.ar ?? null,
        SpanishText: data.es ?? null,
        IsActive: data.IsActive ?? true,
      });

      return {
        success: true,
        message: "Translation added successfully",
        result,
      };
    } catch (error: any) {
      throw new Error(error.message || "Database insert failed");
    }
  }
  async updateTranslation(
    TranslationID: number,
    data: {
      key: string;
      en: string;
      ar?: string | null;
      es?: string | null;
    }
  ) {
    if (!TranslationID) {
      throw new Error("TranslationID is required.");
    }

    if (!data?.key || !data?.en) {
      throw new Error("Translation key and English text are required.");
    }

    try {
      const result = await executeStoredProcedure("sp_UpdateTranslation", {
        TranslationID,
        TranslationKey: data.key,
        EnglishText: data.en,
        ArabicText: data.ar ?? null,
        SpanishText: data.es ?? null,
      });

      return {
        success: true,
        message: "Translation updated successfully",
        result,
      };
    } catch (error: any) {
      throw new Error(error.message || "Database update failed");
    }
  }

  // header
  async getHeaderComponents(): Promise<HeaderComponent[]> {
    try {
      return await executeQuery<HeaderComponent>(
        `SELECT UI_Translation_id, UI_Translation_name
       FROM UI_Translation`
      );
    } catch (err) {
      throw new Error("Failed to load UI Translation data.");
    }
  }
  private readonly COMPONENT_SP_MAP: Record<string, string> = {
    HeadingComponent: "sp_GetHeadingComponent",
  };
  private readonly updateProcMap: Record<ComponentType, string> = {
    heading: "sp_UpdateHeaderComponent",
  };
  async getComponentTable<T>(tableName: string): Promise<T[]> {
    const spName = this.COMPONENT_SP_MAP[tableName];
    if (!spName) throw new Error("Invalid table name (Blocked for safety).");

    try {
      return await executeStoredProcedure<T>(spName, {});
    } catch (err) {
      throw new Error(`Failed to load component table: ${tableName}`);
    }
  }
  async getComponentTables(): Promise<Record<string, any[]>> {
    try {
      const [header] = await Promise.all([
        this.getComponentTable("HeadingComponent"),
      ]);
      return { header };
    } catch {
      throw new Error("Failed to load UI components.");
    }
  }
  async updateComponent(
    componentId: number,
    data: {
      component: string;
      component_name: string;
      componentType?: string;
    }
  ) {
    const normalizedType = (data.componentType?.toLowerCase() ||
      "heading") as ComponentType;

    const procedureName = this.updateProcMap[normalizedType];

    if (!procedureName) {
      throw new Error(`Invalid component type: ${data.componentType}`);
    }

    try {
      return await executeStoredProcedure(procedureName, {
        ui_component_id: componentId,
        component: data.component,
        component_name: data.component_name,
      });
    } catch (err) {
      throw new Error("Failed to update component.");
    }
  }
  async insertHeaderComponent(data: {
    component: string;
    component_name: string;
  }) {
    if (!data.component || !data.component_name) {
      throw new Error("Component and Component Name are required.");
    }

    try {
      return await executeStoredProcedure("sp_HeaderComponent", {
        component: data.component,
        component_name: data.component_name,
      });
    } catch (err) {
      throw new Error("Failed to insert header component.");
    }
  }

  //------------------------------------------- Geographic Management------------------------------------
  // country

  async getCountries(): Promise<CountryWithUniverse[]> {
    try {
      return await executeStoredProcedure<CountryWithUniverse>(
        "sp_GetCountries",
        {}
      );
    } catch (err) {
      throw new Error("Database error while fetching country list.");
    }
  }

  async insertCountry(
    country: Omit<Country, "CountryID" | "CreatedAt" | "UpdatedAt">
  ): Promise<Country[]> {
    try {
      if (!country.CountryName || !country.CountryCode) {
        throw new Error("CountryName and CountryCode are required.");
      }

      return await executeStoredProcedure<Country>("sp_InsertCountry", {
        CountryName: country.CountryName,
        CountryCode: country.CountryCode,
        ISO2Code: country.ISO2Code ?? null,
        ISO3Code: country.ISO3Code ?? null,
        CountryNumeric: country.CountryNumeric ?? null,
        PhoneCode: country.PhoneCode ?? null,
        Capital: country.Capital ?? null,
        CurrencyCode: country.CurrencyCode ?? null,
        CurrencyName: country.CurrencyName ?? null,
        TLD: country.TLD ?? null,
        Region: country.Region ?? null,
        RegionID: country.RegionID ?? null,
        SubRegion: country.SubRegion ?? null,
        SubRegionID: country.SubRegionID ?? null,
        Nationality: country.Nationality ?? null,
        Timezones: country.Timezones ?? null,
        Latitude: country.Latitude ?? null,
        Longitude: country.Longitude ?? null,
        IsActive: country.IsActive ?? true,
        UniverseID: country.UniverseID ?? null,
      });
    } catch (err) {
      throw new Error("Database error while inserting country.");
    }
  }
  async updateCountry(
    countryId: number,
    country: Partial<Country>
  ): Promise<Country[]> {
    try {
      if (!countryId) throw new Error("CountryID is required.");

      return await executeStoredProcedure<Country>("sp_UpdateCountry", {
        CountryID: countryId,
        CountryName: country.CountryName ?? null,
        CountryCode: country.CountryCode ?? null,
        ISO2Code: country.ISO2Code ?? null,
        ISO3Code: country.ISO3Code ?? null,
        PhoneCode: country.PhoneCode ?? null,
        Capital: country.Capital ?? null,
        CurrencyCode: country.CurrencyCode ?? null,
        CurrencyName: country.CurrencyName ?? null,
        TLD: country.TLD ?? null,
        Region: country.Region ?? null,
        RegionID: country.RegionID ?? null,
        SubRegion: country.SubRegion ?? null,
        SubRegionID: country.SubRegionID ?? null,
        Nationality: country.Nationality ?? null,
        Timezones: country.Timezones ?? null,
        Latitude: country.Latitude ?? null,
        Longitude: country.Longitude ?? null,
        UniverseID: country.UniverseID ?? null,
        IsActive: country.IsActive ?? null,
      });
    } catch (err) {
      throw new Error("Database error while updating country.");
    }
  }

  // states

  async getStates(): Promise<(State & { UniverseName?: string })[]> {
    try {
      const query = `
      SELECT 
        s.*,
        u.UniverseName
      FROM dbo.States AS s
      LEFT JOIN dbo.Universe AS u 
        ON s.UniverseID = u.UniverseID
    `;

      return await executeQuery<State & { UniverseName?: string }>(query, []);
    } catch (err) {
      throw new Error("Database error while fetching states.");
    }
  }
  async getStatesByCountry(countryId: number): Promise<State[]> {
    try {
      if (!countryId || typeof countryId !== "number") {
        throw new Error("Invalid CountryID.");
      }

      return await executeQuery<State>(
        "SELECT * FROM States WHERE CountryID = @CountryID AND IsActive = 1",
        { CountryID: countryId }
      );
    } catch (err: any) {
      throw new Error("Failed to fetch states for country.");
    }
  }
  async insertState(
    state: Omit<State, "StateID" | "CreatedDate">
  ): Promise<State[]> {
    try {
      if (!state.CountryID) throw new Error("CountryID is required.");
      if (!state.StateName) throw new Error("StateName is required.");

      return await executeStoredProcedure<State>("sp_InsertState", {
        CountryID: state.CountryID,
        CountryCode: state.CountryCode,
        CountryName: state.CountryName,
        StateCode: state.StateCode,
        StateName: state.StateName,
        StateType: state.StateType,
        Latitude: state.Latitude,
        Longitude: state.Longitude,
        UniverseID: state.UniverseID || null,
        IsActive: state.IsActive,
      });
    } catch (err: any) {
      throw new Error("Failed to insert new state.");
    }
  }
  async updateState(stateId: number, state: Partial<State>): Promise<State[]> {
    try {
      if (!stateId || typeof stateId !== "number") {
        throw new Error("StateID is required for update.");
      }

      return await executeStoredProcedure<State>("sp_UpdateState", {
        StateID: stateId,
        StateName: state.StateName,
        StateCode: state.StateCode,
        StateType: state.StateType,
        CountryID: state.CountryID,
        CountryCode: state.CountryCode,
        CountryName: state.CountryName,
        Latitude: state.Latitude,
        Longitude: state.Longitude,
        UniverseID: state.UniverseID ?? null,
        IsActive: state.IsActive,
      });
    } catch (err: any) {
      throw new Error("Failed to update state details.");
    }
  }

  // city

  async getCities(): Promise<(City & { UniverseName?: string })[]> {
    try {
      return await executeStoredProcedure<City & { UniverseName?: string }>(
        "sp_GetCities",
        {}
      );
    } catch (err) {
      throw new Error("Failed to fetch city list.");
    }
  }
  async getCitiesByState(stateId: number): Promise<City[]> {
    try {
      if (!stateId || typeof stateId !== "number") {
        throw new Error("Invalid StateID.");
      }

      return await executeStoredProcedure<City>("sp_GetCitiesByState", {
        StateID: stateId,
      });
    } catch (err) {
      throw new Error("Failed to fetch cities for the selected state.");
    }
  }
  async insertCity(
    city: Omit<City, "CreatedAt" | "UpdatedAt">
  ): Promise<City[]> {
    try {
      if (!city.CityName) throw new Error("CityName is required.");
      if (!city.StateID) throw new Error("StateID is required.");
      if (!city.StateName) throw new Error("StateName is required.");
      if (!city.CountryID) throw new Error("CountryID is required.");
      if (!city.CountryName) throw new Error("CountryName is required.");

      return await executeStoredProcedure<City>("sp_InsertCity", {
        CityName: city.CityName,
        StateID: city.StateID,
        StateName: city.StateName,
        CountryID: city.CountryID,
        CountryName: city.CountryName,
        PostalCode: city.PostalCode,
        Latitude: city.Latitude,
        Longitude: city.Longitude,
        WikiDataID: city.WikiDataID,
        UniverseID: city.UniverseID ?? null,
        IsActive: city.IsActive ?? 1,
      });
    } catch (err: any) {
      throw new Error("Failed to insert city.");
    }
  }
  async updateCity(cityId: number, city: Partial<City>): Promise<City> {
    try {
      if (!cityId || typeof cityId !== "number") {
        throw new Error("CityID is required for update.");
      }

      const params = {
        CityID: cityId,
        CityName: city.CityName ?? null,
        StateID: city.StateID ?? null,
        StateName: city.StateName ?? null,
        CountryID: city.CountryID ?? null,
        CountryName: city.CountryName ?? null,
        PostalCode: city.PostalCode ?? null,
        Latitude: city.Latitude ?? null,
        Longitude: city.Longitude ?? null,
        WikiDataID: city.WikiDataID ?? null,
        UniverseID: city.UniverseID ?? null,
        IsActive: city.IsActive ?? true,
      };

      const result = await executeStoredProcedure<City>(
        "sp_UpdateCity",
        params
      );

      return Array.isArray(result) ? result[0] : result;
    } catch (err: any) {
      throw new Error("Failed to update city.");
    }
  }

  // ----------------------------------------------organizational Management---------------------------

  // company
  async getCompanies(universeId?: string): Promise<CompanyWithUniverse[]> {
    try {
      return await executeStoredProcedure<CompanyWithUniverse>(
        "sp_GetCompanies",
        {
          UniverseID: universeId ?? null,
        }
      );
    } catch (err) {
      throw new Error("Failed to retrieve companies.");
    }
  }
  async insertCompany(
    company: Omit<Company, "CompanyID" | "CreatedDate">
  ): Promise<Company[]> {
    try {
      return await executeStoredProcedure<Company>("sp_InsertCompany", {
        CompanyCode: company.CompanyCode,
        CompanyName: company.CompanyName,
        CityID: company.CityID,
        CityName: company.CityName,
        UniverseID: company.UniverseID,
        Address: company.Address,
        Email: company.Email,
        Website: company.Website,
        IsActive: company.IsActive,
      });
    } catch (error) {
      throw new Error("Failed to insert company.");
    }
  }
  async updateCompany(
    companyId: number,
    company: Partial<Company>
  ): Promise<Company[]> {
    try {
      return await executeStoredProcedure<Company>("sp_UpdateCompany", {
        CompanyID: companyId,
        CompanyName: company.CompanyName ?? "",
        CompanyCode: company.CompanyCode ?? "",
        CityID: company.CityID ?? null,
        CityName: company.CityName ?? null,
        UniverseID: company.UniverseID ?? null,
        Address: company.Address ?? null,
        Email: company.Email ?? null,
        Website: company.Website ?? null,
        IsActive: company.IsActive ?? true,
      });
    } catch (error) {
      throw new Error("Failed to update company.");
    }
  }

  // Division
  async getDivisions(): Promise<Division[]> {
    try {
      return await executeStoredProcedure<Division>("sp_GetDivisions", {});
    } catch (error) {
      throw new Error("Failed to fetch divisions.");
    }
  }
  async insertDivision(
    division: Omit<
      Division,
      "DivisionID" | "CreatedDate" | "UpdatedDate" | "CompanyName"
    >
  ): Promise<Division> {
    try {
      const result = await executeStoredProcedure<Division>(
        "sp_InsertDivision",
        {
          CompanyID: division.CompanyID,
          DivisionCode: division.DivisionCode,
          DivisionName: division.DivisionName,
          Description: division.Description ?? null,
          IsActive: division.IsActive ?? true,
        }
      );

      return result[0];
    } catch (error) {
      throw new Error("Failed to insert division.");
    }
  }
  async updateDivision(
    divisionId: number,
    division: Partial<
      Omit<
        Division,
        "DivisionID" | "CreatedDate" | "UpdatedDate" | "CompanyName"
      >
    >
  ): Promise<Division> {
    try {
      const result = await executeStoredProcedure<Division>(
        "sp_UpdateDivision",
        {
          DivisionID: divisionId,
          CompanyID: division.CompanyID ?? null,
          DivisionCode: division.DivisionCode ?? null,
          DivisionName: division.DivisionName ?? null,
          Description: division.Description ?? null,
          IsActive: division.IsActive ?? true,
        }
      );

      return result[0];
    } catch (error) {
      throw new Error("Failed to update division.");
    }
  }

  // Department
  async getDepartments(): Promise<Department[]> {
    try {
      return await executeStoredProcedure<Department>("sp_GetDepartments", {});
    } catch (error) {
      throw new Error("Failed to fetch departments.");
    }
  }
  async insertDepartment(
    department: Omit<Department, "DepartmentID" | "CreatedDate">
  ): Promise<Department> {
    try {
      const result = await executeStoredProcedure<Department>(
        "sp_InsertDepartment",
        {
          CompanyID: department.CompanyID ?? null,
          CompanyName: department.CompanyName ?? null,
          DivisionID: department.DivisionID ?? null,
          DivisionName: department.DivisionName ?? null,
          DepartmentName: department.DepartmentName,
          Description: department.Description ?? null,
          IsActive: department.IsActive ?? true,
        }
      );

      return result[0];
    } catch (error) {
      throw new Error("Failed to insert department.");
    }
  }
  async updateDepartment(
    departmentId: number,
    department: Partial<Department>
  ): Promise<Department> {
    try {
      const result = await executeStoredProcedure<Department>(
        "sp_UpdateDepartment",
        {
          DepartmentID: departmentId,
          CompanyID: department.CompanyID ?? null,
          CompanyName: department.CompanyName ?? null,
          DivisionID: department.DivisionID ?? null,
          DivisionName: department.DivisionName ?? null,
          DepartmentName: department.DepartmentName ?? null,
          Description: department.Description ?? null,
          IsActive: department.IsActive ?? true,
        }
      );

      return result[0];
    } catch (error) {
      throw new Error("Failed to update department.");
    }
  }

  // WorkTeams
  async getWorkTeams(): Promise<WorkTeam[]> {
    try {
      return await executeStoredProcedure<WorkTeam>("sp_GetWorkTeams", {});
    } catch (error) {
      throw new Error("Failed to fetch work teams.");
    }
  }
  async insertWorkTeam(
    workTeam: Omit<WorkTeam, "WorkTeamID" | "CreatedDate" | "WorkTeamCode">
  ): Promise<WorkTeam> {
    try {
      const result = await executeStoredProcedure<WorkTeam>(
        "sp_InsertWorkTeam",
        {
          WorkTeamName: workTeam.WorkTeamName,
          DepartmentID: workTeam.DepartmentID,
          Description: workTeam.Description ?? null,
          IsActive: workTeam.IsActive ?? true,
        }
      );

      return result[0]; // return inserted row
    } catch (error) {
      throw new Error("Failed to insert work team.");
    }
  }
  async updateWorkTeam(
    workTeamId: number,
    workTeam: Pick<
      WorkTeam,
      "WorkTeamName" | "DepartmentID" | "Description" | "IsActive"
    >
  ): Promise<WorkTeam> {
    try {
      const result = await executeStoredProcedure<WorkTeam>(
        "sp_UpdateWorkTeam",
        {
          WorkTeamID: workTeamId,
          WorkTeamName: workTeam.WorkTeamName,
          DepartmentID: workTeam.DepartmentID,
          Description: workTeam.Description ?? null,
          IsActive: workTeam.IsActive ?? true,
        }
      );

      return result[0]; // updated record
    } catch (error) {
      throw new Error("Failed to update work team.");
    }
  }

  //-------------------------------------------------System  assets-------------------------------------------

  // assets
  async getUserRoles() {
    try {
      return await executeStoredProcedure("sp_GetUserRoles", {});
    } catch (error) {
      throw new Error("Failed to fetch user roles");
    }
  }
  async insertAsset(asset: {
    AssetName: string;
    AssetDescription: string;
    AssetType: string;
    AssetKey?: string;
    PermissionLevel?: string | string[];
  }): Promise<any> {
    try {
      return await executeStoredProcedure("sp_InsertAsset", {
        AssetName: asset.AssetName?.trim(),

        AssetDescription: asset.AssetDescription?.trim() ?? null,

        AssetType: asset.AssetType?.trim() ?? null,

        AssetKey: asset.AssetKey?.trim() ?? null,

        PermissionLevel: Array.isArray(asset.PermissionLevel)
          ? asset.PermissionLevel.join(",")
          : asset.PermissionLevel ?? null,
      });
    } catch (error: any) {
      // NEVER expose raw SQL error messages to user
      if (String(error.message).toLowerCase().includes("unique")) {
        throw new Error("Asset already exists");
      }

      throw new Error("Failed to create asset");
    }
  }
  async updateAsset(asset: {
    AssetID: number;
    AssetName: string;
    AssetDescription: string;
    AssetType: string;
    AssetKey: string;
    PermissionLevel: string[] | string;
  }) {
    try {
      return await executeStoredProcedure("sp_UpdateAsset", {
        AssetID: asset.AssetID,
        AssetName: asset.AssetName?.trim(),
        AssetDescription: asset.AssetDescription?.trim() ?? null,
        AssetType: asset.AssetType?.trim() ?? null,
        AssetKey: asset.AssetKey?.trim() ?? null,
        PermissionLevel: Array.isArray(asset.PermissionLevel)
          ? asset.PermissionLevel.join(",")
          : asset.PermissionLevel ?? null,
      });
    } catch (error) {
      throw new Error("Failed to update asset");
    }
  }
  async getAssets() {
    try {
      const result = await executeStoredProcedure("GetAssetsWithUsers");
      return result;
    } catch (error) {
      throw new Error("Failed to fetch assets with users");
    }
  }

  // asset logs
  async insertAccessLog(log: AccessLog): Promise<void> {
    try {
      await executeStoredProcedure("sp_InsertAccessLog", {
        Timestamp: log.Timestamp,
        Role: log.Role,
        Asset: log.Asset,
        Action: log.Action,
        Status: log.Status,
        IPAddress: log.IPAddress,
        Details: log.Details,
        UniverseID: log.UniverseID,
      });
    } catch (error: any) {
      // Extract SQL Server message safely (optional)
      const message =
        error?.originalError?.message ||
        error?.message ||
        "Unknown database error";

      // Prevent leaking internal SQL information in API
      throw new Error("Failed to insert access log");
    }
  }
  async getAccessLogs(): Promise<AccessLog[]> {
    try {
      return await executeQuery<AccessLog>("EXEC sp_GetAccessLogs");
    } catch (error) {
      throw new Error("Failed to fetch access logs");
    }
  }

  // Roles
  async insertRole(
    role: Omit<Role, "Id" | "CreatedAt" | "UpdatedAt">
  ): Promise<Role[]> {
    try {
      if (!role.Assets || role.Assets.trim() === "") {
        throw new Error("AssetName is required");
      }

      const roleString = Array.isArray(role.Role)
        ? role.Role.join(",")
        : role.Role ?? "";

      const permissionsString = Array.isArray(role.Permissions)
        ? role.Permissions.join(", ")
        : role.Permissions ?? "";

      return await executeStoredProcedure<Role>("sp_InsertRole", {
        AssetName: role.Assets.trim(), // map Assets -> AssetName
        Role: roleString,
        Description: role.Description ?? "",
        Permissions: permissionsString,
      });
    } catch (error: any) {
      const message =
        error?.originalError?.message || error?.message || "Unknown error";

      if (message.toLowerCase().includes("duplicate")) {
        throw new Error("Role already exists");
      }

      throw new Error("Failed to insert role");
    }
  }
  async updateRole(
    roleId: number,
    role: Partial<Role> & { Assets?: string }
  ): Promise<Role[]> {
    try {
      if (!roleId) {
        throw new Error("Role Id is required");
      }

      const assetName = role.Assets?.trim() ?? role.AssetName ?? "";

      const roleString = Array.isArray(role.Role)
        ? role.Role.join(",")
        : role.Role ?? "";

      const permissionsString = Array.isArray(role.Permissions)
        ? role.Permissions.join(", ")
        : role.Permissions ?? "";

      return await executeStoredProcedure<Role>("sp_UpdateRole", {
        Id: roleId,
        AssetName: assetName,
        Role: roleString,
        Description: role.Description ?? null,
        Permissions: permissionsString,
      });
    } catch (error: any) {
      const message =
        error?.originalError?.message || error?.message || "Unknown error";

      if (message.toLowerCase().includes("duplicate")) {
        throw new Error("Role already exists");
      }

      throw new Error("Failed to update role");
    }
  }
  async getRoles(): Promise<
    {
      Id: number;
      AssetName: string;
      Role: string;
      Description?: string;
      Permissions?: string;
    }[]
  > {
    try {
      return await executeStoredProcedure("sp_GetRoles", {});
    } catch (error) {
      throw new Error("Failed to fetch roles");
    }
  }

  // ------------------------------------------Universe----------------------------------

  async getUniverses(): Promise<Universe[]> {
    try {
      return await executeStoredProcedure<Universe>("sp_GetUniverses", {});
    } catch (error) {
      throw new Error("Failed to fetch universes");
    }
  }
  async insertUniverse(
    universe: Omit<Universe, "UniverseID" | "CreatedDate">
  ): Promise<Universe[]> {
    try {
      if (!universe.UniverseName || universe.UniverseName.trim() === "") {
        throw new Error("UniverseName is required");
      }

      const universeID = uuidv4();

      return await executeStoredProcedure<Universe>("sp_InsertUniverse", {
        UniverseID: universeID,
        UniverseName: universe.UniverseName.trim(),
        Description: universe.Description ?? "",
        IsActive: universe.IsActive ?? true,
      });
    } catch (error: any) {
      const message =
        error?.originalError?.message || error?.message || "Unknown error";

      if (message.toLowerCase().includes("duplicate")) {
        throw new Error("Universe already exists");
      }

      throw new Error("Failed to create universe");
    }
  }
  async updateUniverse(
    universeId: string,
    universe: Partial<Universe>
  ): Promise<Universe[]> {
    try {
      if (!universeId) {
        throw new Error("UniverseID is required");
      }

      return await executeStoredProcedure<Universe>("sp_UpdateUniverse", {
        UniverseID: universeId,
        UniverseName: universe.UniverseName?.trim() ?? null,
        Description: universe.Description ?? null,
        IsActive: universe.IsActive ?? null,
      });
    } catch (error) {
      throw new Error("Failed to update universe");
    }
  }

    //  Currency Management
  async getCurrencies() {
    return executeQuery("SELECT * FROM Currencies ORDER BY CurrencyName");
  }

  async insertCurrency(data: any) {
    return executeStoredProcedure("sp_InsertCurrency", {
      CurrencyCode: data.CurrencyCode,
      CurrencyName: data.CurrencyName,
      Symbol: data.Symbol,
      Country: data.Country,
      DecimalPlaces: data.DecimalPlaces,
      IsActive: data.IsActive,
    });
  }

  async updateCurrency(id: number, data: any) {
    return executeStoredProcedure("sp_UpdateCurrency", {
      CurrencyID: id,
      CurrencyCode: data.CurrencyCode,
      CurrencyName: data.CurrencyName,
      Symbol: data.Symbol,
      Country: data.Country,
      DecimalPlaces: data.DecimalPlaces,
      IsActive: data.IsActive,
    });
  }

  async deleteCurrency(id: number) {
    return executeQuery(`DELETE FROM Currencies WHERE CurrencyID = ${id}`);
  }
}


export const frameworkService = new FrameworkService();
