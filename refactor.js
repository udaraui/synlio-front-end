const { Project } = require("ts-morph");
const fs = require("fs");
const path = require("path");

const project = new Project({
  tsConfigFilePath: "e:/Projects/synlio-front-end/tsconfig.json",
});

const servicesDir = project.getDirectory("e:/Projects/synlio-front-end/src/services");

if (!servicesDir) {
  console.error("Services directory not found.");
  process.exit(1);
}

// Get all files directly inside src/services (not in subdirectories)
const files = servicesDir.getSourceFiles();

const unusedFiles = [];
const movedFiles = [];

for (const file of files) {
  // Only process loose files, not files in subdirectories
  if (path.dirname(file.getFilePath()) !== path.normalize("e:/Projects/synlio-front-end/src/services").replace(/\\/g, "/")) {
    continue;
  }

  const fileName = file.getBaseName();
  
  // Skip API.ts or index files if any
  if (fileName.toLowerCase() === "api.ts" || fileName === "index.ts") {
    continue;
  }

  // Check if it's used
  // We can find all references to the file's exports
  let isUsed = false;
  const exportedDeclarations = file.getExportedDeclarations();
  for (const [name, declarations] of exportedDeclarations) {
    for (const dec of declarations) {
      if (dec.findReferencesAsNodes().length > 0) {
        isUsed = true;
        break;
      }
    }
    if (isUsed) break;
  }

  if (!isUsed) {
    console.log(`Deleting unused service: ${fileName}`);
    unusedFiles.push(fileName);
    file.delete(); // Delete from project
  } else {
    // Determine folder name
    // E.g., "auth-service.ts" -> "auth"
    // "activity.service.ts" -> "activity"
    let folderName = fileName.replace(".service.ts", "").replace("-service.ts", "").replace("-services.ts", "");
    
    // Some special names to normalize
    if (folderName === "auth") folderName = "auth";

    const newPath = path.join("e:/Projects/synlio-front-end/src/services", folderName, fileName).replace(/\\/g, "/");
    console.log(`Moving ${fileName} to ${newPath}`);
    
    // ts-morph automatically updates all imports in the project!
    file.moveToDirectory(servicesDir.createDirectory(folderName));
    movedFiles.push(fileName);
  }
}

console.log("Saving changes...");
project.saveSync();

console.log(`Done. Removed ${unusedFiles.length} files, moved ${movedFiles.length} files.`);
