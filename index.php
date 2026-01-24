<?php
$toolsSubfolder = 'tools'; 
$baseDir = __DIR__ . '/' . $toolsSubfolder;

$categories = [
    'art'   => 'Art & Design',
    'audio' => 'Audio & Sound Lab',
    'dev'   => 'Developer Utilities',
    'plan'  => 'Planning Tools'
];

function getToolDescription($category, $folder, $sub) {
    // Correct Path: tools/category/tool/index.html
    $indexFile = __DIR__ . '/' . $sub . '/' . $category . '/' . $folder . '/index.html';
    if (!file_exists($indexFile)) return "";

    $content = file_get_contents($indexFile);

    if (preg_match("/<title>(.*?)<\/title>/is", $content, $matches)) {
        return trim($matches[1]);
    }
    if (preg_match("/<h1>(.*?)<\/h1>/is", $content, $matches)) {
        return trim($matches[1]);
    }
    return "";
}

function getToolThumbnail($category, $folder, $sub) {
    // Correct Path: tools/category/tool/thumbnail.png
    $thumbPath = __DIR__ . '/' . $sub . '/' . $category . '/' . $folder . '/thumbnail.png';
    if (file_exists($thumbPath)) {
        return $sub . '/' . $category . '/' . $folder . '/thumbnail.png';
    }

    $indexFile = __DIR__ . '/' . $sub . '/' . $category . '/' . $folder . '/index.html';
    if (file_exists($indexFile)) {
        $content = file_get_contents($indexFile);
        if (preg_match('/<img\s+[^>]*src=["\']([^"\']+)["\']/i', $content, $matches)) {
            return $sub . '/' . $category . '/' . $folder . '/' . $matches[1];
        }
    }
    return null;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>URage Tools - Free Online Web Utilities</title>
    <meta name="description" content="A collection of fast, free, and privacy-focused web tools for developers and creators. Featuring a Seamless Texture Maker, HTML Separator, and more.">
    <link rel="canonical" href="https://tools.urage.net/">
    
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
    <link rel="manifest" href="/site.webmanifest">

    <meta property="og:type" content="website">
    <meta property="og:url" content="https://tools.urage.net/">
    <meta property="og:title" content="URage Tools - Powerful Utilities for Developers">
    <meta property="og:description" content="Explore a suite of professional tools for web development and 3D art. No sign-up required, all tools run directly in your browser.">
    <meta property="og:image" content="https://tools.urage.net/thumbnail.png">

    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="URage Tools">
    <meta name="twitter:description" content="Free browser-based tools for web developers and digital artists.">
    <meta name="twitter:image" content="https://tools.urage.net/thumbnail.png">

    <link rel="stylesheet" href="style.css">
    <link href="_shared/fontawesome/css/all.min.css" rel="stylesheet">
</head>
<body>
    <?php include 'header.html'; ?>

    <div class="hero-wrapper">
        <main id="viewport" class="hero-bg">
            <canvas id="mainCanvas"></canvas>
        </main>
        <div class="hero-content">
            <div class="hero-badge">URage Tools</div>
            <h1>Powerful Utilities for <span>Developers & Artists</span></h1>
            <p>A collection of fast, free, and privacy-focused web tools for web development and 3D art. No sign-up required, all tools run directly in your browser.</p>
            
            <div class="hero-actions">
                <a href="#headerdev" class="cta-btn btn-filled">
                    <span>✂️</span> Image Crop & Scale
                </a>
                <a href="#headerart" class="cta-btn btn-glass">
                    <span>🎨</span> Pixel Art Studio
                </a>
            </div>
        </div>
        <div class="scroll-down">↓</div>
    </div>

    <div class="container">
        <?php foreach ($categories as $catKey => $catName): ?>
            <?php
            // Scan only directories within the category folder inside /tools
            $catDir = $baseDir . '/' . $catKey;
            $tools = [];
            if (is_dir($catDir)) {
                $tools = array_filter(scandir($catDir), function($item) use ($catDir) {
                    return !in_array($item, ['.', '..']) && is_dir($catDir . '/' . $item);
                });
                sort($tools);
            }
            ?>

            <?php if (!empty($tools)): ?>
                <div class="category-header" id="<?php echo "header" . $catKey; ?>">
                    <h2><?php echo $catName; ?></h2>
                </div>
                <div class="category-wrapper">
                    <div class="tools-grid">
                        <?php foreach ($tools as $tool): 
                            // Updated: Passing $toolsSubfolder to helper functions
                            $description = getToolDescription($catKey, $tool, $toolsSubfolder);
                            if (!$description) {
                                $description = "A useful tool for " . ucwords(str_replace('-', ' ', $tool)) . ".";
                            }
                            $thumbnail = getToolThumbnail($catKey, $tool, $toolsSubfolder);
                            $cleanName = ucwords(str_replace('-', ' ', $tool));
                            
                            // Updated: Link now includes the tools subfolder
                            $toolLink = $toolsSubfolder . '/' . $catKey . '/' . $tool;
                        ?>
                            <div class="tool-card">
                                <img src="<?php echo $thumbnail; ?>" alt="<?php echo $cleanName; ?> Thumbnail" loading="lazy" />
                                <div class="tool-card-content">
                                    <h2><?php echo $cleanName; ?></h2>
                                    <p><?php echo htmlspecialchars($description); ?></p>
                                    <a href="<?php echo $toolLink; ?>" class="tool-link btn btn-inferno-stretch">Open tool</a>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            <?php endif; ?>
        <?php endforeach; ?>

    </div>
    <?php include 'footer.html'; ?>
    <script src="script.js"></script>
</body>
</html>
