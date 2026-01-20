<?php
$baseDir = __DIR__;
$categories = [
    'art'      => 'Art & Design',
    'audio'    => 'Audio & Sound Lab',
    'dev'      => 'Developer Utilities',
    'plan' => 'Planning Tools'
];

function getToolDescription($category, $folder) {
    $indexFile = __DIR__ . '/' . $category . '/' . $folder . '/index.html';
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

function getToolThumbnail($category, $folder) {
    $thumbPath = __DIR__ . '/' . $category . '/' . $folder . '/thumbnail.png';
    if (file_exists($thumbPath)) {
        return $category . '/' . $folder . '/thumbnail.png';
    }

    $indexFile = __DIR__ . '/' . $category . '/' . $folder . '/index.html';
    if (file_exists($indexFile)) {
        $content = file_get_contents($indexFile);
        if (preg_match('/<img\s+[^>]*src=["\']([^"\']+)["\']/i', $content, $matches)) {
            return $category . '/' . $folder . '/' . $matches[1];
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
    <link href="fontawesome/css/all.min.css" rel="stylesheet">
</head>
<body>
    <header class="header">
        <div class="header-container">
            <div class="site-branding">
                <a href="https://tools.urage.net/" title="URage Tools">
                    <img height="48" class="site-logo" src="logo.png" alt="URage Tools">
                </a>
            </div>
            <div class="header-socials">
                <a href="https://urage.net/discord" class="social-icon" data-label="Discord"><span><i class="fa-brands fa-discord"></i></span></a>
                <a href="https://urage.net/youtube" class="social-icon" data-label="YouTube"><span><i class="fa-brands fa-youtube"></i></span></a>
                <a href="https://urage.net/bluesky" class="social-icon" data-label="Bluesky"><span><i class="fa-brands fa-bluesky"></i></span></a>
                <a href="https://urage.net/github" class="social-icon" data-label="GitHub"><span><i class="fa-brands fa-github"></i></span></a>
            </div>
        </div>
    </header>

	<div class="hero-wrapper">
		<main id="viewport" class="hero-bg">
            <!-- <div class="animation-container">
                <canvas id="lavaCanvas"></canvas>
            </div> -->
            <canvas id="mainCanvas"></canvas>
        </main>
		<div class="hero-content">
			<div class="hero-badge">URage Tools</div>
			<h1>Forge Your <span>Visual Assets</span> with Precision</h1>
			<p>A suite of high-performance tools for developers and artists to crop, scale, and pixelate images for any platform in seconds.</p>
			
			<div class="hero-actions">
				<a href="#cropper" class="cta-btn btn-filled">
					<span>✂️</span> Image Crop & Scale
				</a>
				<a href="#pixel-art" class="cta-btn btn-glass">
					<span>🎨</span> Pixel Art Studio
				</a>
			</div>
		</div>
		<div class="scroll-down">↓</div>
	</div>
    <header>

    </header>
    <div class="container">
        <?php foreach ($categories as $catKey => $catName): ?>
            <?php
            // Scan only directories within the category folder
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
                            $description = getToolDescription($catKey, $tool);
                            if (!$description) {
                                $description = "A useful tool for " . ucwords(str_replace('-', ' ', $tool)) . ".";
                            }
                            $thumbnail = getToolThumbnail($catKey, $tool);
                            $cleanName = ucwords(str_replace('-', ' ', $tool));
                        ?>
                            <div class="tool-card">
                                <img src="<?php echo $thumbnail; ?>" alt="<?php echo $cleanName; ?> Thumbnail" loading="lazy" />
                                <div class="tool-card-content">
                                    <h2><?php echo $cleanName; ?></h2>
                                    <p><?php echo htmlspecialchars($description); ?></p>
                                    <form action="<?php echo $catKey . '/' . $tool; ?>" class="tool-form">
                                        <input type="submit" value="Open tool" class="btn-inferno-stretch" />
                                    </form>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                </div>
            <?php endif; ?>
        <?php endforeach; ?>

    </div>
    
    <script src="script.js"></script>
</body>
</html>
