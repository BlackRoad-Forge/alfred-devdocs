<?php
/**
 * Basic unit tests for the Alfred DevDocs workflow
 * Tests core functionality without requiring Alfred or macOS
 */

// Minimal test framework
class TestRunner {
    private $passed = 0;
    private $failed = 0;
    private $errors = [];

    public function assert($condition, $message) {
        if ($condition) {
            $this->passed++;
            echo "  PASS: $message\n";
        } else {
            $this->failed++;
            $this->errors[] = $message;
            echo "  FAIL: $message\n";
        }
    }

    public function assertEqual($expected, $actual, $message) {
        $this->assert($expected === $actual, "$message (expected: " . var_export($expected, true) . ", got: " . var_export($actual, true) . ")");
    }

    public function summary() {
        echo "\n--- Test Results ---\n";
        echo "Passed: {$this->passed}\n";
        echo "Failed: {$this->failed}\n";
        if ($this->failed > 0) {
            echo "\nFailed tests:\n";
            foreach ($this->errors as $error) {
                echo "  - $error\n";
            }
            exit(1);
        }
        exit(0);
    }
}

$test = new TestRunner();

echo "=== Alfred DevDocs Workflow Tests ===\n\n";

// ---- Test 1: PHP syntax validation ----
echo "1. PHP Syntax Validation\n";

$files = [
    __DIR__ . '/../src/scripts/devdocs.php',
    __DIR__ . '/../src/scripts/conf.php',
    __DIR__ . '/../src/scripts/workflows.php',
];

foreach ($files as $file) {
    $basename = basename($file);
    if (file_exists($file)) {
        $output = [];
        $returnCode = 0;
        exec("php -l " . escapeshellarg($file) . " 2>&1", $output, $returnCode);
        $test->assert($returnCode === 0, "Syntax check: $basename");
    } else {
        $test->assert(false, "File exists: $basename");
    }
}

// ---- Test 2: Composer dependencies ----
echo "\n2. Dependency Validation\n";

$composerFile = __DIR__ . '/../src/scripts/composer.json';
$test->assert(file_exists($composerFile), "composer.json exists");

$composerData = json_decode(file_get_contents($composerFile), true);
$test->assert($composerData !== null, "composer.json is valid JSON");
$test->assert(isset($composerData['require']['rodneyrehm/plist']), "plist dependency declared");

$lockFile = __DIR__ . '/../src/scripts/composer.lock';
$test->assert(file_exists($lockFile), "composer.lock exists");

$lockData = json_decode(file_get_contents($lockFile), true);
$test->assert($lockData !== null, "composer.lock is valid JSON");

// Verify pinned version
$plistPackage = null;
foreach ($lockData['packages'] as $pkg) {
    if ($pkg['name'] === 'rodneyrehm/plist') {
        $plistPackage = $pkg;
        break;
    }
}
$test->assert($plistPackage !== null, "plist package found in lock file");
$test->assertEqual('a59040c1c86188eec89de43f8827b42a0bd36028', $plistPackage['source']['reference'], "plist pinned to commit hash");

// ---- Test 3: Autoloader ----
echo "\n3. Autoloader\n";

$autoloader = __DIR__ . '/../src/scripts/vendor/autoload.php';
$test->assert(file_exists($autoloader), "vendor/autoload.php exists");

// ---- Test 4: Icon files ----
echo "\n4. Icon Files\n";

$requiredIcons = ['icon.png', 'doc.png'];
foreach ($requiredIcons as $icon) {
    $iconPath = __DIR__ . '/../src/' . $icon;
    $test->assert(file_exists($iconPath), "Icon exists: $icon");
}

// ---- Test 5: Info.plist ----
echo "\n5. Workflow Configuration\n";

$plistPath = __DIR__ . '/../src/info.plist';
$test->assert(file_exists($plistPath), "info.plist exists");

$plistContent = file_get_contents($plistPath);
$test->assert(strpos($plistContent, 'com.yannickglt.alfred4.devdocs') !== false, "Bundle ID present in info.plist");
$test->assert(strpos($plistContent, 'devdocs') !== false, "Workflow name present");

// ---- Test 6: Plist template ----
echo "\n6. Plist Template\n";

$templatePath = __DIR__ . '/../src/scripts/plist.phtml';
$test->assert(file_exists($templatePath), "plist.phtml template exists");

// ---- Test 7: .gitignore ----
echo "\n7. Git Configuration\n";

$gitignore = __DIR__ . '/../.gitignore';
$test->assert(file_exists($gitignore), ".gitignore exists");

$gitignoreContent = file_get_contents($gitignore);
$test->assert(strpos($gitignoreContent, 'cache') !== false, ".gitignore excludes cache");
$test->assert(strpos($gitignoreContent, '.DS_Store') !== false, ".gitignore excludes .DS_Store");

// ---- Test 8: Cloudflare Worker ----
echo "\n8. Cloudflare Worker\n";

$workerPath = __DIR__ . '/../cloudflare-worker/src/index.js';
$test->assert(file_exists($workerPath), "Worker index.js exists");

$wranglerPath = __DIR__ . '/../cloudflare-worker/wrangler.toml';
$test->assert(file_exists($wranglerPath), "wrangler.toml exists");

$workerPkgPath = __DIR__ . '/../cloudflare-worker/package.json';
$test->assert(file_exists($workerPkgPath), "Worker package.json exists");

$workerPkg = json_decode(file_get_contents($workerPkgPath), true);
$test->assert($workerPkg !== null, "Worker package.json is valid JSON");
$test->assert(isset($workerPkg['devDependencies']['wrangler']), "Wrangler dependency pinned");

// ---- Test 9: GitHub Actions workflows ----
echo "\n9. GitHub Actions Workflows\n";

$workflows = ['ci.yml', 'release.yml', 'automerge.yml', 'codeql.yml', 'stale.yml'];
foreach ($workflows as $wf) {
    $wfPath = __DIR__ . '/../.github/workflows/' . $wf;
    $test->assert(file_exists($wfPath), "Workflow exists: $wf");
}

// ---- Test 10: Security files ----
echo "\n10. Security Configuration\n";

$securityPath = __DIR__ . '/../SECURITY.md';
$test->assert(file_exists($securityPath), "SECURITY.md exists");

$dependabotPath = __DIR__ . '/../.github/dependabot.yml';
$test->assert(file_exists($dependabotPath), "dependabot.yml exists");

// Summary
$test->summary();
