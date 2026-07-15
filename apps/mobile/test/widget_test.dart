import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:carguy_mobile/app.dart';

void main() {
  testWidgets('CarGuy app builds', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: CarGuyApp()));
    await tester.pump();
    expect(find.textContaining('Car'), findsWidgets);
  });
}
