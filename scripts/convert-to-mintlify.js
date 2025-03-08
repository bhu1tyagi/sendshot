const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Configuration
const sourceDir = 'docs/references'; // Directory with TypeDoc MD files
const mintJsonPath = 'mint.json'; // Path to mint.json file

// Function to convert a single file in place
function convertFileInPlace(filePath) {
  // Read the source file
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract the title from the content (usually the first heading)
  let title = path.basename(filePath, '.md');
  const titleMatch = content.match(/^# (.+)$/m);
  if (titleMatch) {
    title = titleMatch[1];
  }

  // Generate a description based on the content
  let description = '';
  const descriptionMatch = content.match(/^# .+\n\n(.+)$/m);
  if (descriptionMatch) {
    description = descriptionMatch[1];
  } else {
    description = `Documentation for ${title}`;
  }

  // Add frontmatter to the content
  const frontmatter = `---
title: "${title}"
description: "${description}"
---

`;

  // Update all internal links to point to .mdx files instead of .md files
  let updatedContent = content.replace(/\]\(([^)]+)\.md\)/g, ']($1.mdx)');

  // Combine frontmatter and updated content
  const finalContent = frontmatter + updatedContent;

  // Create the new file path with .mdx extension
  const mdxFilePath = filePath.replace(/\.md$/, '.mdx');

  // Write the converted content to the new file
  fs.writeFileSync(mdxFilePath, finalContent);
  
  // Remove the original .md file
  fs.unlinkSync(filePath);

  console.log(`Converted: ${filePath} -> ${mdxFilePath}`);
}

// Find all Markdown files in the source directory
glob(`${sourceDir}/**/*.md`, (err, files) => {
  if (err) {
    console.error('Error finding files:', err);
    return;
  }

  console.log(`Found ${files.length} files to convert`);

  // Convert each file in place
  files.forEach(convertFileInPlace);

  // Update mint.json with the new file extensions
  updateMintJson();

  console.log('Conversion complete!');
});

// Function to update mint.json with the converted files
function updateMintJson() {
  try {
    // Read the mint.json file
    const mintJsonContent = fs.readFileSync(mintJsonPath, 'utf8');
    let mintJson;
    
    try {
      mintJson = JSON.parse(mintJsonContent);
    } catch (parseError) {
      console.error('Error parsing mint.json:', parseError);
      return;
    }

    // Find all .mdx files in the docs/references directory
    const mdxFiles = glob.sync('docs/references/**/*.mdx');
    console.log(`Found ${mdxFiles.length} .mdx files to add to mint.json`);

    // Find the Reference group
    const referenceGroup = mintJson.navigation.find(item => item.group === "Reference");

    if (referenceGroup) {
      console.log('Found Reference group in mint.json');
      
      // Create a new pages array with the main references entry
      const newPages = ['docs/references'];
      
      // Create a map to organize files by directory
      const directoryMap = {};
      
      // Process each file and organize by directory
      mdxFiles.forEach(file => {
        // Remove the .mdx extension for the navigation
        const navPath = file.replace(/\.mdx$/, '');
        
        // Skip the main references file
        if (navPath === 'docs/references') return;
        
        // Get the directory structure
        const parts = navPath.split('/');
        
        // Skip if there are not enough parts (should be at least docs/references/something)
        if (parts.length < 3) return;
        
        // Start from the references directory
        let currentLevel = directoryMap;
        let currentPath = 'docs/references';
        
        // Build the nested structure
        for (let i = 2; i < parts.length - 1; i++) {
          const part = parts[i];
          currentPath = `${currentPath}/${part}`;
          
          if (!currentLevel[part]) {
            currentLevel[part] = {
              path: currentPath,
              children: {}
            };
          }
          
          currentLevel = currentLevel[part].children;
        }
        
        // Add the file to the current level
        const fileName = parts[parts.length - 1];
        if (!currentLevel[fileName]) {
          currentLevel[fileName] = {
            path: navPath,
            isFile: true
          };
        }
      });
      
      // Function to convert the directory map to Mintlify navigation structure
      function buildNavigationStructure(dirMap, parentPath = '') {
        const result = [];
        
        // First, add all files at this level
        Object.keys(dirMap).forEach(key => {
          const item = dirMap[key];
          if (item.isFile) {
            result.push(item.path);
          }
        });
        
        // Then, add all directories as groups
        Object.keys(dirMap).forEach(key => {
          const item = dirMap[key];
          if (!item.isFile) {
            const children = buildNavigationStructure(item.children, item.path);
            if (children.length > 0) {
              // If the directory has a README file, add it first
              const readmePath = `${item.path}/README`;
              if (children.includes(readmePath)) {
                // Move README to the beginning
                const index = children.indexOf(readmePath);
                children.splice(index, 1);
                children.unshift(readmePath);
              }
              
              result.push({
                group: key,
                pages: children
              });
            }
          }
        });
        
        return result;
      }
      
      // Build the navigation structure
      const navigationStructure = buildNavigationStructure(directoryMap);
      
      // Update the pages array with the new structure
      referenceGroup.pages = newPages.concat(navigationStructure);
      
      console.log('Original pages:', JSON.stringify(referenceGroup.pages, null, 2));
      console.log('New pages structure created with nested subgroups');
    } else {
      console.log('Reference group not found in mint.json');
    }

    // Write the updated mint.json back to file
    fs.writeFileSync(mintJsonPath, JSON.stringify(mintJson, null, 2));
    console.log(`Updated mint.json with nested subgroups for folders`);
    
  } catch (error) {
    console.error('Error updating mint.json:', error);
  }
}
