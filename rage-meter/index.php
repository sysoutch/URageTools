<?php
// Include the header
include "../header.html";
?>

<main class="main-content">
    <?php
    // Read and include the content from index.html
    $htmlContent = file_get_contents("index.html");
    echo $htmlContent;
    ?>
</main>

<?php
// Include the footer
include "../footer.html";
?>

