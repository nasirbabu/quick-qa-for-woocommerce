/**
 * Black Friday / Cyber Monday 2026 seasonal sale admin notice.
 * Fully self-contained — including a local copy of the clipboard fallback
 * helper — so this file can be deleted with the rest of the feature after
 * the sale ends without touching quick-qa-for-woocommerce-admin.js.
 */

function quickQaBfcmFallbackCopyTextToClipboard(text) {
  var textArea = document.createElement("textarea");
  textArea.value = text;

  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.width = "2em";
  textArea.style.height = "2em";
  textArea.style.padding = "0";
  textArea.style.border = "none";
  textArea.style.outline = "none";
  textArea.style.boxShadow = "none";
  textArea.style.background = "transparent";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand("copy");
  } catch (err) {
    console.error("Askora: fallback copy failed", err);
  }

  document.body.removeChild(textArea);
}

jQuery(document).ready(function ($) {
  $('#qq-bfcm-code, #qq-bfcm-copy-btn').on('click', function () {
    var code = window.quickQaBfcm ? window.quickQaBfcm.couponCode : '';
    var showCopied = function () {
      $('#qq-bfcm-copy-status').fadeIn().delay(1500).fadeOut();
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(showCopied, function () {
        quickQaBfcmFallbackCopyTextToClipboard(code);
        showCopied();
      });
    } else {
      quickQaBfcmFallbackCopyTextToClipboard(code);
      showCopied();
    }
  });

  $('#qq-bfcm-dismiss').on('click', function () {
    var $notice = $('#qq-bfcm-notice');
    $notice.fadeOut(200);

    if (!window.quickQaBfcm) {
      return;
    }

    $.post(window.quickQaBfcm.ajaxUrl, {
      action: window.quickQaBfcm.action || 'quick_qa_bfcm_dismiss',
      nonce: window.quickQaBfcm.nonce
    }).fail(function (err) {
      console.error('Askora: failed to persist Black Friday notice dismissal', err);
    });
  });
});
