<?php
// Read and include the content from index.html
$htmlContent = file_get_contents("index.html");
?>

<?php
// Include the footer before the </body> tag of the $htmlContent content where data-theme can be any value and is optional
$headerCss = "<link rel=\"stylesheet\" href=\"header.css\">";
$footerCss = "<link rel=\"stylesheet\" href=\"footer.css\">";
$htmlContent = str_replace("</head>", $headerCss . $footerCss . "</head>", $htmlContent);
?>

<?php
// Include the header after the <body data-theme="dark"> tag of the $htmlContent content where data-theme can be any value and is optional
$header = file_get_contents("../../header.html");
$contentWithHeader = preg_replace('/<body( data-theme="[^"]*")?>/', '<body$1>' . $header, $htmlContent);
?>

<?php
// Include the footer before the </body> tag of the $htmlContent content where data-theme can be any value and is optional
$footer = file_get_contents("../../footer.html");
echo str_replace("</body>", $footer . "</body>", $contentWithHeader);
?>