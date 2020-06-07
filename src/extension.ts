import * as vscode from 'vscode'

import { formatEdhLines } from './edh-fmt'

export function activate(_context: vscode.ExtensionContext) {

	vscode.languages.registerDocumentRangeFormattingEditProvider('edh', {
		provideDocumentRangeFormattingEdits(
			document: vscode.TextDocument, range: vscode.Range,
			_options: vscode.FormattingOptions, _token: vscode.CancellationToken,
		): vscode.ProviderResult<vscode.TextEdit[]> {
			return formatEdhLines(document, range)
		}
	})

}

export function deactivate() { }
