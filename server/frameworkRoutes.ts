import { Router } from "express";
import { getPool } from "./db";
import { frameworkService } from "./FrameworkRouteFunctions";
import { DeleteFunctions } from "./FrameworkDeleteFunctions";
const router = Router();
import bcrypt from "bcrypt";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import {logger } from "./db";
// -------------------------------------------- framework dashboard------------------------------------------------------

export interface AuthRequest extends Request {
  user?: any;
}

export const verifyToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Token missing" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Invalid token format" });


 jwt.verify(
    token,
    process.env.JWT_SECRET as string,
    { algorithms: ["HS256"] },   // prevent alg downgrade attack
    (err, decoded) => {
      if (err) {
        logger.warn("Invalid JWT detected", { ip: req.ip, error: err.message });
        return res.status(403).json({ message: "Invalid / expired token" });
      }

      req.user = decoded;
      next();
    }
  );
};

export const rateLimiterForInternalRoutes = rateLimit({
  windowMs: 60 * 1000, 
  max: 5,              
  message: {
    message: "Too many requests"
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get(
  "/api/framework/test-azure-connection",
  verifyToken,
  // requireAdminRole,
  rateLimiterForInternalRoutes,
  async (req, res) => {
    
    try {
      const pool = await getPool();

      const totalTablesResult = await pool.request().query(
        "SELECT COUNT(*) AS totalTables FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'"
      );

      const connectedTablesResult = await pool.request().query(
        "SELECT COUNT(DISTINCT fk.parent_object_id) AS connectedTables FROM sys.foreign_keys fk"
      );

      const activeConnectionsResult = await pool.request().query(
        "SELECT COUNT(*) AS activeConnections FROM sys.dm_exec_sessions WHERE status='running' AND is_user_process=1"
      );

      const tablesWithPKResult = await pool.request().query(
        `SELECT COUNT(DISTINCT t.name) AS tablesWithPK
         FROM sys.tables t
         INNER JOIN sys.indexes i ON t.object_id = i.object_id
         WHERE i.is_primary_key = 1`
      );

      const totalTables = totalTablesResult.recordset[0]?.totalTables ?? 0;
      const connectedTables = connectedTablesResult.recordset[0]?.connectedTables ?? 0;
      const activeConnections = activeConnectionsResult.recordset[0]?.activeConnections ?? 0;
      const tablesWithPK = tablesWithPKResult.recordset[0]?.tablesWithPK ?? 0;

      const dataIntegrity = totalTables > 0 ? Math.round((tablesWithPK / totalTables) * 100) : 0;

      res.json({
        connected: true,
        message: "Azure SQL connection successful",
        totalTables,
        connectedTables,
        activeConnections,
        dataIntegrity,
      });
    } catch (err: unknown) {
      if (err instanceof Error) console.error(err.message);
      else console.error(err);
      res.status(500).json({ connected: false, message: "Connection failed" });
    }
  }
);

// -------------------------------------------------usermanagement-------------------------------------------

 
router.get("/api/admin_users", async (req, res) => {
  console.log("Usermanagement---")
  try {
    const users = await frameworkService.getAdminUsers();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});
router.post("/api/admin_users", async (req, res) => {
  try {
    const data = req.body;

    if (
      !data.Username ||
      !data.Email ||
      !data.PasswordHash ||
      !data.UniverseID
    ) {
      return res.status(400).json({
        error: "UniverseID, Username, Email, and PasswordHash are required.",
      });
    }

    //  Hash the password before storing
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.PasswordHash, saltRounds);

    const result = await frameworkService.insertAdminUser({
      ...data,
      PasswordHash: hashedPassword,
    });

    res.status(201).json({
      message: " User created successfully",
      result,
    });
  }catch (error) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : "Failed to create user";

  return {
    success: false,
    error: message,
  };
}

});
router.put("/api/admin_users/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const data = req.body;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({ error: "Invalid user ID." });
    }

    if (!data.Username || !data.Email || !data.PasswordHash) {
      return res
        .status(400)
        .json({ error: "Username, Email, and PasswordHash are required." });
    }

    //  Hash password before updating
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.PasswordHash, saltRounds);

    const result = await frameworkService.updateAdminUser({
      ...data,
      UserID: userId,
      PasswordHash: hashedPassword,
    });

    res.status(200).json({
      message: " User updated successfully",
      result,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});
router.delete("/api/admin_users/:id", async (req, res) => {
  const userId = parseInt(req.params.id, 10);
  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
    const success = await DeleteFunctions.deleteAdmin_User(userId);
    if (success) {
      return res.status(200).json({ message: "User deleted successfully" });
    } else {
      return res.status(404).json({ error: "User not found" }); // Optional: 404 instead of 500
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ----------------------------------------------system  assets---------------------------------------------
//  roles
router.get("/api/framework/user-roles", async (req, res) => {
  try {
    const userRoles = await frameworkService.getUserRoles();
    res.json(userRoles); 
  } catch (error) {
    console.error("Error fetching user roles:", error);
    res.status(500).json({ error: "Failed to fetch user roles" });
  }
});

// assets
router.post("/api/framework/assets", async (req, res) => {
  try {
    const result = await frameworkService.insertAsset(req.body);
    res.json(result);
  } catch (error: any) {
    console.error("Error creating asset:", error);
    const msg = error.originalError?.message || error.message;
    if (msg.includes("already exists")) {
      return res.status(400).json({ error: "Asset already exists" }); 
    }

    return res.status(500).json({ error: "Failed to create asset" }); // fallback
  }
});
router.get("/api/framework/assets", async (req, res) => {
  try {
    const assets = await frameworkService.getAssets();
    res.json(assets); 
  } catch (error) {
    console.error("Error fetching assets:", error);
    res.status(500).json({ error: "Failed to fetch assets" });
  }
});
router.put("/api/framework/assets/:id", async (req, res) => {
  try {
    const assetData = { AssetID: req.params.id, ...req.body }; // merge ID with body
    const result = await frameworkService.updateAsset(assetData);
    res.json(result);
  } catch (error: any) {
    console.error("Error updating asset:", error);
    const isDuplicate = error.message?.includes("already exists");
    res.status(isDuplicate ? 400 : 500).json({
      error: isDuplicate ? "Asset already exists" : "Failed to update asset",
    });
  }
});
router.delete("/api/framework/assets/:id", async (req, res) => {
  const assetId = parseInt(req.params.id, 10);

  if (isNaN(assetId)) {
    return res.status(400).json({ error: "Invalid asset ID" });
  }

  try {
    const result = await DeleteFunctions.deleteAsset(assetId);
    if (result.success) {
      return res.status(200).json({ message: "Asset deleted successfully" });
    } else {
      return res.status(500).json({ error: "Failed to delete asset" });
    }
  } catch (error) {
    console.error("Error deleting asset:", error);
    res.status(500).json({ error: "Failed to delete asset" });
  }
});

// roles
router.get("/api/framework/permissionroles", async (req, res) => {
  try {
    const roles = await frameworkService.getRoles();
    res.json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ error: "Failed to fetch roles" });
  }
});
router.post("/api/framework/permissionroles", async (req, res) => {
  try {
    const result = await frameworkService.insertRole(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error inserting role:", error);
    res.status(500).json({ error: "Failed to insert role" });
  }
});
router.put("/api/framework/permissionroles/:id", async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    const result = await frameworkService.updateRole(roleId, req.body);
    return res
      .status(200)
      .json({ message: "Role updated successfully", result });
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ error: "Failed to update role" });
  }
});
router.delete("/api/framework/permissionroles/:id", async (req, res) => {
  try {
    const roleId = parseInt(req.params.id, 10);

    if (isNaN(roleId)) {
      return res.status(400).json({ message: "Invalid Role ID" });
    }

    const result = await DeleteFunctions.deleteRoleById(roleId);

    if (result.success) {
      return res.status(200).json({ message: "Role deleted successfully" });
    } else {
      return res.status(404).json({ message: "Role not found" });
    }
  } catch (error: any) {
    console.error("Error deleting role:", error);
    return res
      .status(500)
      .json({ message: error.message || "Failed to delete role" });
  }
});

// access log

router.get("/api/framework/log-access", async (req, res) => {
  try {
    const logs = await frameworkService.getAccessLogs();
    res.json(logs);
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ error: "Failed to fetch access logs" });
  }
});
router.post("/api/framework/log-access", async (req, res) => {
  try {
    const result = await frameworkService.insertAccessLog(req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error inserting log:", error);
    res.status(500).json({ error: "Failed to insert log" });
  }
});

// ---------------------------------------------framework dashboard--------------------------------------
const modules = [
  {
    id: "/framework/geographic",
    title: "Geographic Management",
    description: "Countries, States, Cities hierarchical management",
    color: "bg-blue-500",
    tables: ["Universe", "Countries", "States", "Cities"],
  },
  {
    id: "/framework/organizational",
    title: "Organizational Structure",
    description: "Companies, Divisions, Departments, Teams",
    color: "bg-green-500",
    tables: ["Companies", "Divisions", "Departments", "WorkTeams"],
  },
  {
    id: "/framework/Localization",
    title: "Localization & Translation",
    description: "Languages, Translations, UI Translations",

    tables: ["Languages", "Translations", "UI_Translations"],
    color: "bg-orange-500",
  },
  {
    id: "/admin/user",
    title: "User Management",
    description: "Users and access management",
    color: "bg-purple-500",
    tables: ["users"], // lowercase, as in your actual table
  },
  
  {
    id: "/framework/SystemAssets",
    title: "SystemAssets",
    description: "Asset management and role-based access",

    tables: ["SystemAssets"],
    color: "bg-red-500",
  },
    {
    id: "/admin/RoleManagement",
    title: "Role Management",
    description: "Asset management and role-based access",

    tables: [ "RoleAssetAccess", "AssetAccessLogs"],
    color: "bg-red-500",
  },
  {
    id: "/framework/CurrencyManagement",
    title: "Currency Management",
    description: "currency management ",

    tables: ["Currencies"],
    color: "bg-red-500",
  },
  
];
router.get("/api/framework/modules", async (req, res) => {
  try {
    const pool = await getPool();

    const enhancedModules = [];

    for (const module of modules) {
      const tablesWithCounts = [];

      for (const tableName of module.tables) {
        try {
          const countResult = await pool
            .request()
            .query(
              `SELECT COUNT(*) AS count FROM dbo.[${tableName}] WHERE IsActive = 1`
            );
          const count = countResult.recordset[0]?.count ?? 0;
          tablesWithCounts.push({ name: tableName, count });
        } catch (err) {
          tablesWithCounts.push({ name: tableName, count: 0 }); // default if error
        }
      }

      enhancedModules.push({
        ...module,
        tables: tablesWithCounts,
        count: tablesWithCounts.length,
      });
    }

    res.json(enhancedModules);
  } catch (err) {
    console.error("Failed to fetch framework modules:", err);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

// ---------------------------------------------universe-------------------------------------------------
router.get("/api/framework/universes", async (req, res) => {
  try {
    const universes = await frameworkService.getUniverses();
    res.json(universes);
  } catch (error) {
    console.error("Error fetching universes:", error);
    res.status(500).json({ error: "Failed to fetch universes" });
  }
});
router.post("/api/framework/universes", async (req, res) => {
  try {
    const result = await frameworkService.insertUniverse(req.body);
    res.json(result);
  } catch (error) {
    console.error("Error creating universe:", error);
    res.status(500).json({ error: "Failed to create universe" });
  }
});
router.put("/api/framework/universes/:id", async (req, res) => {
  try {
    const result = await frameworkService.updateUniverse(
      req.params.id,
      req.body
    );
    res.json(result);
  } catch (error) {
    console.error("Error updating universe:", error);
    res.status(500).json({ error: "Failed to update universe" });
  }
});
router.delete("/api/framework/universes/:id", async (req, res) => {
  const universeId = req.params.id; // 👈 keep as string, not number

  if (!universeId || universeId.trim() === "") {
    return res.status(400).json({ error: "Invalid Universe ID" });
  }

  try {
    const result = await DeleteFunctions.deleteUniverse(universeId); // 👈 pass as string

    if (result.success) {
      return res.status(200).json({ message: "Universe deleted successfully" });
    } else {
      return res.status(500).json({ error: "Failed to delete universe" });
    }
  } catch (error) {
    console.error("Error deleting universe:", error);
    return res
      .status(500)
      .json({ error: "Server error while deleting universe" });
  }
});

// -------------------------------------localization----------------------------------------------------

// languages
router.get("/api/framework/languages", async (req, res) => {
  try {
    const languages = await frameworkService.getLanguages();
    res.json(languages);
  } catch (error) {
    console.error("Error fetching languages:", error);
    res.status(500).json({ error: "Failed to fetch languages" });
  }
});
router.post("/api/framework/languages", async (req, res) => {
  try {
    const result = await frameworkService.insertLanguage(req.body);

    res.json(result);
  } catch (error) {
    console.error("Error creating language:", error);
    res.status(500).json({ error: "Failed to create language" });
  }
});
router.put("/api/framework/languages/:id", async (req, res) => {
  try {
    const result = await frameworkService.updateLanguage(
      parseInt(req.params.id),
      req.body
    );
    return res
      .status(200)
      .json({ message: "Language updated successfully", result });
  } catch (error) {
    console.error("Error updating language:", error);
    res.status(500).json({ error: "Failed to update language" });
  }
});
router.delete("/api/framework/languages/:id", async (req, res) => {
  const languageId = parseInt(req.params.id, 10);

  if (isNaN(languageId)) {
    return res.status(400).json({ error: "Invalid language ID" });
  }

  const result = await DeleteFunctions.deleteLanguage(languageId);

  if (result.success) {
    return res.status(200).json({ message: "Language deleted successfully" });
  } else {
    return res.status(500).json({ error: "Failed to delete language" });
  }
});

// translation
router.get("/api/framework/translations", async (req, res) => {
  try {
    const translations = await frameworkService.getTranslation(); // service call
    res.json(translations); // return result to client
  } catch (error) {
    console.error("Error fetching translations:", error);
    res.status(500).json({ error: "Failed to fetch translations" });
  }
});
router.put("/api/framework/translations/:id", async (req, res) => {
  try {
    const translationId = Number(req.params.id);
    const result = await frameworkService.updateTranslation(
      translationId,
      req.body
    );
    return res
      .status(200)
      .json({ message: "Translation updated successfully", result });
  } catch (error) {
    console.error("Error updating translation:", error);
    res.status(500).json({ message: "Failed to update translation" });
  }
});
router.post("/api/framework/translations", async (req, res) => {
  try {
    const result = await frameworkService.insertTranslation(req.body);
    // res.json(result);
    return res.status(200).json({ message: "Translation added successfully" });
  } catch (error) {
    console.error("Error creating translation:", error);
    res.status(500).json({ error: "Failed to create translation" });
  }
});
router.delete("/api/framework/translations/:id", async (req, res) => {
  const translationId = parseInt(req.params.id, 10);

  if (isNaN(translationId)) {
    return res.status(400).json({ error: "Invalid translation ID" });
  }

  const result = await DeleteFunctions.deleteTranslation(translationId);

  if (result.success) {
    return res
      .status(200)
      .json({ message: "Translation deleted successfully" });
  } else {
    return res.status(500).json({ error: "Failed to delete translation" });
  }
});

// UI-translation name
router.get("/api/framework/ui-translations", async (req, res) => {
  try {
    const result = await frameworkService.getUITranslations();
    res.json(result);
  } catch (error) {
    console.error("Error fetching UI translations:", error);
    res.status(500).json({ error: "Failed to fetch UI translations" });
  }
});
router.post("/api/framework/ui-translations", async (req, res) => {
  try {
    await frameworkService.insertUITranslation(req.body);
    res.status(200).json({ message: "UI Translation added successfully" });
  } catch (error: any) {
    console.error("Error adding UI translation:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to add UI translation" });
  }
});
router.delete("/api/framework/ui-translations/:id", async (req, res) => {
  try {
    const translationId = parseInt(req.params.id, 10);

    if (isNaN(translationId)) {
      return res.status(400).json({ message: "Invalid Translation ID" });
    }

    const result = await DeleteFunctions.deleteUITranslationById(translationId);

    if (result.success) {
      res.status(200).json({ message: "UI Translation deleted successfully" });
    } else {
      res.status(404).json({ message: "UI Translation not found" });
    }
  } catch (error: any) {
    console.error("Error deleting UI Translation:", error);
    res
      .status(500)
      .json({ message: error.message || "Failed to delete UI Translation" });
  }
});

// UI-Translation components
router.get("/api/framework/header-components", async (req, res) => {
  try {
    const components = await frameworkService.getHeaderComponents();
    res.json(components);
  } catch (error) {
    console.error("Error fetching header components:", error);
    res.status(500).json({ error: "Failed to fetch header components" });
  }
});
router.post("/api/framework/header-components", async (req, res) => {
  try {
    const result = await frameworkService.insertHeaderComponent(req.body);
    return res.status(200).json({ message: "Component added successfully" });
  } catch (error) {
    console.error("Error adding component:", error);
    res.status(500).json({ error: "Failed to add component" });
  }
});
router.get("/api/framework/component-tables", async (req, res) => {
  try {
    const result = await frameworkService.getComponentTables();
    res.json(result);
  } catch (error) {
    console.error("Error fetching component tables:", error);
    res.status(500).json({ error: "Failed to fetch component tables" });
  }
});
router.put("/api/framework/components/:id", async (req, res) => {
  const componentId = Number(req.params.id);
  const { component_name, component, componentType } = req.body;

  if (isNaN(componentId) || !component_name?.trim() || !component?.trim()) {
    return res.status(400).json({
      message: "Missing component ID, name, or type.",
    });
  }

  try {
    // Pass the componentType to your service
    const result = await frameworkService.updateComponent(componentId, {
      component,
      component_name,
      componentType, // <- NEW
    });

    return res.status(200).json({
      message: `Component updated successfully (${componentType})`,
      result,
    });
  } catch (error) {
    console.error("Error updating component:", error);
    res.status(500).json({ message: "Failed to update component", error });
  }
});
router.delete("/api/framework/components/:id", async (req, res) => {
  const ui_component_id = parseInt(req.params.id, 10);
  const component_name = req.query.component_name as string; 

  if (!component_name) {
    return res.status(400).json({ message: "Component name is required" });
  }

  try {
    await DeleteFunctions.deleteComponent(ui_component_id, component_name);
    return res.status(200).json({ message: "Component deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    return res.status(500).json({ message: "Failed to delete component" });
  }
});

// -----------------------------------Geographic management----------------------------------------------
// Country routes
router.get("/api/framework/countries", async (req, res) => {
  try {
    const countries = await frameworkService.getCountries();
    res.json(countries);
  } catch (error) {
    console.error("Error fetching countries:", error);
    res.status(500).json({ error: "Failed to fetch countries" });
  }
});
router.post("/api/framework/countries", async (req, res) => {
  try {
    const result = await frameworkService.insertCountry(req.body);
    res.json(result);
  } catch (error) {
    console.error("Error creating country:", error);
    res.status(500).json({ error: "Failed to create country" });
  }
});
router.put("/api/framework/countries/:id", async (req, res) => {
  try {
    const result = await frameworkService.updateCountry(
      parseInt(req.params.id),
      req.body
    );
    res.json(result);
  } catch (error) {
    console.error("Error updating country:", error);
    res.status(500).json({ error: "Failed to update country" });
  }
});
router.delete("/api/framework/countries/:id", async (req, res) => {
  try {
    const countryId = parseInt(req.params.id);

    if (isNaN(countryId)) {
      return res.status(400).json({ error: "Invalid country id" });
    }

    const { success } = await DeleteFunctions.deleteCountry(countryId);

    if (success) {
      res.json({
        success: true,
        message: "Country deleted successfully from SQL Server",
      });
    } else {
      res
        .status(404)
        .json({ error: "Delete operation failed or country not found" });
    }
  } catch (error) {
    console.error("Error deleting country:", error);
    res.status(500).json({
      error: "Failed to delete country",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// State routes
router.get("/api/framework/states", async (req, res) => {
  try {
    const states = await frameworkService.getStates();
    return res.json(states);
  } catch (error) {
    console.error("Error fetching states:", error);
    res.status(500).json({ error: "Failed to fetch states" });
  }
});
router.get("/api/framework/states/country/:countryId", async (req, res) => {
  try {
    const states = await frameworkService.getStatesByCountry(
      parseInt(req.params.countryId)
    );
    res.json(states);
  } catch (error) {
    console.error("Error fetching states by country:", error);
    res.status(500).json({ error: "Failed to fetch states by country" });
  }
});
router.post("/api/framework/states", async (req, res) => {
  try {
    await frameworkService.insertState(req.body);
    res.status(201).json({ message: "State created successfully" });
  } catch (error: any) {
    console.error("Error creating state:", error);

    // Check for specific SQL error message from stored procedure
    if (
      error?.originalError?.info?.message === "Duplicate state not allowed."
    ) {
      return res.status(400).json({ error: "DUPLICATE_STATE" });
    }

    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
});
router.put("/api/framework/states/:id", async (req, res) => {
  try {
    const result = await frameworkService.updateState(
      parseInt(req.params.id),
      req.body
    );
    res.json(result);
  } catch (error) {
    console.error("Error updating state:", error);
    res.status(500).json({ error: "Failed to update state" });
  }
});
router.delete("/api/framework/states/:id", async (req, res) => {
  try {
    const stateId = parseInt(req.params.id);

    if (isNaN(stateId)) {
      return res.status(400).json({ error: "Invalid state id" });
    }

    const { success } = await DeleteFunctions.deleteState(stateId);

    if (success) {
      res.json({
        success: true,
        message: "State deleted successfully from SQL Server",
      });
    } else {
      res
        .status(404)
        .json({ error: "Delete operation failed or state not found" });
    }
  } catch (error) {
    console.error("Error deleting state:", error);
    res.status(500).json({
      error: "Failed to delete state",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// City routes
router.get("/api/framework/cities", async (req, res) => {
  try {
    const cities = await frameworkService.getCities();
    res.json(cities);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch cities" });
  }
});
router.get("/api/framework/cities/state/:stateId", async (req, res) => {
  try {
    const cities = await frameworkService.getCitiesByState(
      parseInt(req.params.stateId)
    );
    res.json(cities);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch cities by state" });
  }
});
router.post("/api/framework/cities", async (req, res) => {
  try {
    const result = await frameworkService.insertCity(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to create city" });
  }
});
router.put("/api/framework/cities/:id", async (req, res) => {
  try {
    const result = await frameworkService.updateCity(
      parseInt(req.params.id),
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to update city" });
  }
});
router.delete("/api/framework/cities/:id", async (req, res) => {
  try {
    const cityId = parseInt(req.params.id, 10);
    if (isNaN(cityId)) {
      return res.status(400).json({ error: "Invalid city id" });
    }

    const { success } = await DeleteFunctions.deleteCity(cityId);

    if (success) {
      return res.json({ success: true, message: "City deleted successfully" });
    } else {
      return res
        .status(404)
        .json({ error: "City not found or already deleted" });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Failed to delete city",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ------------------------------------------Organizational management-------------------------------------
// companies routes
router.post("/api/framework/companies", async (req, res) => {
  try {
    const result = await frameworkService.insertCompany(req.body);
    res.json(result);
  } catch (error: any) {

    if (error.originalError?.info?.message) {
      return res.status(400).json({ error: error.originalError.info.message });
    }

    // For custom error (e.g., you throw an error from service with a message)
    if (error.message) {
      return res.status(400).json({ error: error.message });
    }

    // Fallback generic error
    res.status(500).json({ error: "Failed to create company" });
  }
});
router.get("/api/framework/companies", async (req, res) => {
  try {
    const raw = req.query.universeId;

    // ⭐ Safely convert to string or undefined
    const universeId =
      typeof raw === "string" ? raw : undefined;

    const companies = await frameworkService.getCompanies(universeId);

    res.json(companies);
  } catch (error) {

    const message =
      error instanceof Error ? error.message : "Failed to fetch companies";

    res.status(500).json({ error: message });
  }
});
router.put("/api/framework/companies/:id", async (req, res) => {
  try {
    const result = await frameworkService.updateCompany(
      parseInt(req.params.id),
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to update company" });
  }
});
router.delete("/api/framework/companies/:id", async (req, res) => {
  try {
    const companyId = parseInt(req.params.id, 10);
    if (isNaN(companyId)) {
      return res.status(400).json({ error: "Invalid company id" });
    }

    const { success } = await DeleteFunctions.deleteCompany(companyId);

    if (success) {
      return res.json({
        success: true,
        message: "Company deleted successfully",
      });
    } else {
      return res
        .status(404)
        .json({ error: "Company not found or already deleted" });
    }
  } catch (error) {
    return res.status(500).json({
      error: "Failed to delete company",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Division routes
router.get("/api/framework/divisions", async (req, res) => {
  try {
    const divisions = await frameworkService.getDivisions();
    res.json(divisions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch divisions" });
  }
});
router.post("/api/framework/divisions", async (req, res) => {
  try {
    const result = await frameworkService.insertDivision(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to create division" });
  }
});
router.put("/api/framework/divisions/:id", async (req, res) => {
  try {
    const result = await frameworkService.updateDivision(
      parseInt(req.params.id),
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to update division" });
  }
});
router.delete("/api/framework/divisions/:id", async (req, res) => {
  try {
    const divisionId = parseInt(req.params.id, 10);

    if (isNaN(divisionId)) {
      return res.status(400).json({ error: "Invalid division ID" });
    }

    const { success } = await DeleteFunctions.deleteDivision(divisionId);

    if (success) {
      res.json({ success: true, message: "Division deleted successfully" });
    } else {
      res.status(404).json({ error: "Division not found or delete failed" });
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete division",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Department routes
router.get("/api/framework/departments", async (req, res) => {
  try {
    const departments = await frameworkService.getDepartments();
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});
router.post("/api/framework/departments", async (req, res) => {
  try {
    const result = await frameworkService.insertDepartment(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to create department" });
  }
});
router.put("/api/framework/departments/:id", async (req, res) => {
  try {
    const result = await frameworkService.updateDepartment(
      parseInt(req.params.id),
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to update department" });
  }
});
router.delete("/api/framework/departments/:id", async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id);

    if (isNaN(departmentId)) {
      return res.status(400).json({ error: "Invalid department ID" });
    }

    const { success } = await DeleteFunctions.deleteDepartment(departmentId);

    if (success) {
      res.json({
        success: true,
        message: "Department deleted successfully from SQL Server",
      });
    } else {
      res
        .status(404)
        .json({ error: "Delete operation failed or department not found" });
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to delete department",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Work Team routes
router.get("/api/framework/work-teams", async (req, res) => {
  try {
    const workTeams = await frameworkService.getWorkTeams();
    res.json(workTeams);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch work teams" });
  }
});
router.post("/api/framework/work-teams", async (req, res) => {
  try {
    const result = await frameworkService.insertWorkTeam(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to create work team" });
  }
});
router.put("/api/framework/work-teams/:id", async (req, res) => {
  try {
    const result = await frameworkService.updateWorkTeam(
      parseInt(req.params.id),
      req.body
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to update work team" });
  }
});
router.delete("/api/framework/workteams/:id", async (req, res) => {
  try {
    const workTeamId = parseInt(req.params.id);

    if (isNaN(workTeamId)) {
      return res.status(400).json({ error: "Invalid WorkTeam ID" });
    }

    const { success } = await DeleteFunctions.deleteWorkTeam(workTeamId);

    if (success) {
      res.json({ success: true, message: "WorkTeam deleted successfully" });
    } else {
      res.status(404).json({ error: "WorkTeam not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to delete WorkTeam" });
  }
});
// Currency Routes
router.get("/api/framework/currencies", async (req, res) => {
  try {
    const result = await frameworkService.getCurrencies();
    res.json(result);
  } catch (error) {
    console.error("Error fetching currencies:", error);
    res.status(500).json({ error: "Failed to fetch currencies" });
  }
});

router.post("/api/framework/currencies", async (req, res) => {
  try {
    const result = await frameworkService.insertCurrency(req.body);
    res.json(result);
  } catch (error) {
    console.error("Error inserting currency:", error);
    res.status(500).json({ error: "Failed to insert currency" });
  }
});

router.put("/api/framework/currencies/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await frameworkService.updateCurrency(id, req.body);
    res.json(result);
  } catch (error) {
    console.error("Error updating currency:", error);
    res.status(500).json({ error: "Failed to update currency" });
  }
});

router.delete("/api/framework/currencies/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await frameworkService.deleteCurrency(id);
    res.json({ success: true, message: "Currency deleted" });
  } catch (error) {
    console.error("Error deleting currency:", error);
    res.status(500).json({ error: "Failed to delete currency" });
  }
});
export default router;
