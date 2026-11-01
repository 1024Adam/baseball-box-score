/**
 * Baseball Box Score — Google Apps Script Webhook Receiver
 *
 * SETUP INSTRUCTIONS:
 * 1. Open your target Google Sheet.
 * 2. Go to Extensions -> Apps Script.
 * 3. Paste this entire file into Code.gs and click Save.
 * 4. Click Deploy -> New deployment -> Select type: "Web app".
 *    - Execute as: "Me"
 *    - Who has access: "Anyone"
 * 5. Copy the resulting Web App URL (`https://script.google.com/macros/s/.../exec`)
 *    and paste it into the Baseball Box Score app Settings / Webhook URL field.
 *
 * COLUMN ORDER (23 Columns, A through W):
 * A (1):  Date
 * B (2):  Position
 * C (3):  AB
 * D (4):  H
 * E (5):  AVG        (Formula / Calculated)
 * F (6):  1B
 * G (7):  2B
 * H (8):  3B
 * I (9):  HR
 * J (10): E (Batting)
 * K (11): BB
 * L (12): OBP        (Formula / Calculated)
 * M (13): SLG        (Formula / Calculated)
 * N (14): OPS        (Formula / Calculated)
 * O (15): RBI
 * P (16): FC
 * Q (17): K
 * R (18): FO
 * S (19): GO
 * T (20): PO
 * U (21): Assists
 * V (22): Errors
 * W (23): FLD PCT    (Formula / Calculated)
 */

var FORMULA_COLUMN_INDICES_1_BASED = [5, 12, 13, 14, 23]; // E, L, M, N, W

function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({
      ok: true,
      service: 'baseball-box-score-webhook',
      columns: 23,
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Missing request body');
    }

    var payload = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    if (payload.action === 'ping') {
      return ContentService.createTextOutput(
        JSON.stringify({
          ok: true,
          message: 'Connected to sheet: ' + sheet.getName(),
        })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    var row = payload.row || {};
    var formulaMode = payload.formulaMode || 'webhook_preserve_formulas';
    var preserveFormulas =
      formulaMode === 'webhook_preserve_formulas' ||
      formulaMode === 'blank_for_arrayformula';

    var nextRowIndex = sheet.getLastRow() + 1;

    var cells = Array.isArray(payload.cells) && payload.cells.length === 23
      ? payload.cells
      : [
          row.date || '',
          row.position || '',
          Number(row.ab || 0),
          Number(row.h || 0),
          preserveFormulas ? null : row.avg,
          Number(row.singles || 0),
          Number(row.doubles || 0),
          Number(row.triples || 0),
          Number(row.hr || 0),
          Number(row.eBatting || 0),
          Number(row.bb || 0),
          preserveFormulas ? null : row.obp,
          preserveFormulas ? null : row.slg,
          preserveFormulas ? null : row.ops,
          Number(row.rbi || 0),
          Number(row.fc || 0),
          Number(row.k || 0),
          Number(row.fo || 0),
          Number(row.go || 0),
          Number(row.po || 0),
          Number(row.assists || 0),
          Number(row.errors || 0),
          preserveFormulas ? null : row.fldPct,
        ];

    var rowValues = cells.map(function (v) {
      return v === null || v === undefined ? '' : v;
    });

    sheet.getRange(nextRowIndex, 1, 1, 23).setValues([rowValues]);

    // If preserving sheet formulas and there is a previous data row (row >= 3),
    // copy single-row formulas from the previous row for E, L, M, N, W if they exist.
    if (preserveFormulas && nextRowIndex > 2) {
      var prevRowIndex = nextRowIndex - 1;
      for (var i = 0; i < FORMULA_COLUMN_INDICES_1_BASED.length; i++) {
        var colIndex = FORMULA_COLUMN_INDICES_1_BASED[i];
        var prevCell = sheet.getRange(prevRowIndex, colIndex);
        var prevFormula = prevCell.getFormula();
        if (prevFormula && prevFormula.indexOf('ARRAYFORMULA') === -1) {
          var targetCell = sheet.getRange(nextRowIndex, colIndex);
          prevCell.copyTo(
            targetCell,
            SpreadsheetApp.CopyPasteType.PASTE_FORMULA,
            false
          );
        }
      }
    }

    return ContentService.createTextOutput(
      JSON.stringify({
        ok: true,
        rowNumber: nextRowIndex,
        sheetName: sheet.getName(),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({
        ok: false,
        error: err && err.message ? err.message : String(err),
      })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
