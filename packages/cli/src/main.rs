use rustyscript::{json_args, Module, Runtime, RuntimeOptions};
use serde::Deserialize;
use std::env;
use std::fs;
use std::process;

/// Result of formatting a Septic config file
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FormatResult {
    is_formatted: bool,
    formatted_content: String,
    edit_count: usize,
}

/// Diagnostic information from linting
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
#[allow(dead_code)]
struct DiagnosticInfo {
    level: String,
    code: String,
    message: String,
    start_line: usize,
    start_character: usize,
    end_line: usize,
    end_character: usize,
}

/// Result of linting a Septic config file
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LintResult {
    total_count: usize,
    diagnostics: Vec<DiagnosticInfo>,
    success: bool,
}

fn print_usage() {
    eprintln!("Usage: septic-cli <command> <file>");
    eprintln!();
    eprintln!("Commands:");
    eprintln!("  format <file>        Format a Septic config file");
    eprintln!("  format --check <file> Check if file is formatted");
    eprintln!("  lint <file>          Lint a Septic config file");
    eprintln!();
    eprintln!("Examples:");
    eprintln!("  septic-cli format config.cnfg");
    eprintln!("  septic-cli format --check config.cnfg");
    eprintln!("  septic-cli lint config.cnfg");
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let args: Vec<String> = env::args().collect();

    if args.len() < 3 {
        print_usage();
        process::exit(1);
    }

    let command = &args[1];

    match command.as_str() {
        "format" => {
            let (check_only, file_path) = if args[2] == "--check" {
                if args.len() < 4 {
                    eprintln!("Error: --check requires a file path");
                    process::exit(1);
                }
                (true, &args[3])
            } else {
                (false, &args[2])
            };
            run_format(file_path, check_only)?;
        }
        "lint" => {
            let file_path = &args[2];
            run_lint(file_path)?;
        }
        "help" | "--help" | "-h" => {
            print_usage();
        }
        _ => {
            eprintln!("Unknown command: {}", command);
            print_usage();
            process::exit(1);
        }
    }

    Ok(())
}

fn create_runtime() -> Result<Runtime, rustyscript::Error> {
    Runtime::new(RuntimeOptions::default())
}

fn load_module() -> Module {
    // Load the bundled CLI module
    const BUNDLE_JS: &str = include_str!("../../septic/dist/cli-bundle.js");
    Module::new("cli-bundle.js", BUNDLE_JS)
}

fn run_format(file_path: &str, check_only: bool) -> Result<(), Box<dyn std::error::Error>> {
    // Read the file content
    let content = fs::read_to_string(file_path)?;

    // Create runtime and load module
    let mut runtime = create_runtime()?;
    let module = load_module();

    // Load the module and get the handle
    let module_handle = runtime.load_module(&module)?;

    // Call the format function
    let result: FormatResult =
        runtime.call_function(Some(&module_handle), "format", json_args!(content))?;

    if check_only {
        if result.is_formatted {
            println!("✓ {} is formatted correctly", file_path);
            process::exit(0);
        } else {
            println!("✗ {} needs formatting", file_path);
            process::exit(1);
        }
    } else {
        // Write the formatted content back to the file
        fs::write(file_path, &result.formatted_content)?;
        if result.edit_count > 0 {
            println!("✓ Formatted: {} ({} edits)", file_path, result.edit_count);
        } else {
            println!("✓ {} was already formatted", file_path);
        }
    }

    Ok(())
}

fn run_lint(file_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    // Read the file content
    let content = fs::read_to_string(file_path)?;

    // Create runtime and load module
    let mut runtime = create_runtime()?;
    let module = load_module();

    // Load the module and get the handle
    let module_handle = runtime.load_module(&module)?;

    // Call the lint function (it's async, so we need to handle the promise)
    let result: LintResult =
        runtime.call_function(Some(&module_handle), "lint", json_args!(content))?;

    if result.success {
        println!("✓ No issues found in {}", file_path);
    } else {
        println!("{} issue(s) found in {}:", result.total_count, file_path);
        for diag in &result.diagnostics {
            println!(
                "  {} [{}]: {} at {}:{}",
                diag.level, diag.code, diag.message, diag.start_line, diag.start_character
            );
        }
        process::exit(1);
    }

    Ok(())
}
