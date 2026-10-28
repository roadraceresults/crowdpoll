# Overview 

# High Level Requirements  

We want to create a script that will generate a File Manifest for the current project.  
The path to the current project will be specified as the first argument to the script.  

The main purposes of the script are:  
- count the number of files of various types (extension)
- the total number of lines in each file if it is not a binary file
- the size of the file if it is a binary file
- the count of comment lines in the file if it is a file written in a common programming language

## Recommended Implementation  

The first part of this research is to suggest the most appropriate programming language or scripting language for implementing the script.  

Part of this research will involve evaluating the pros and cons of different languages in terms of ease of use, performance, and compatibility with common project structures.

## Output Manifest Files

The script will generate various manifest files summarizing the collected information.  
The manifest files will be markdown format, i.e. .md file extension.  
The manifest files will contain only a markdown table with no additional text.  

The manifest files will be placed in a directory called `manifests` within the project directory.  
If the `manifests` directory does not exist, the script will create it.  
Under the `manifests` directory, the script will create a folder with the name that is the timestamp of when the script started.  
Of course, the script will ensure that the directory name is unique and is a properly formed directory name.  

For all the manifest reports described below, if the top level directory 'node-modules' exists, it will be excluded from the counts and summaries.
For all the manifest reports described below, if the top level directory 'manifests' exists, it will be excluded from the counts and summaries.


