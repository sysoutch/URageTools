<?php
$baseDir = __DIR__;
// Define your subfolders and their display titles
$categories = [
    'art'      => 'Art & Design',
    'audio'    => 'Audio & Sound Lab',
    'dev'      => 'Developer Utilities',
    'plan' => 'Planning Tools'
];

// Reusable function to get tool description from index.html inside subfolders
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

// Reusable function to get tool thumbnail from subfolders
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
    return 'placeholder.png';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tools - URage</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
	<div class="hero-wrapper">
		<div class="hero-bg">
			<div class="blob blob-1"></div>
			<div class="blob blob-2"></div>
		</div>
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
				<div class="header category-header" id="<?php echo "header" . $catKey; ?>">
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
                                <img src="<?php echo $thumbnail; ?>" alt="<?php echo $cleanName; ?> Thumbnail">
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
</body>
</html>
