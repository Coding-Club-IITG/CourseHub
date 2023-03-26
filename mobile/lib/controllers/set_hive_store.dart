import 'package:hive/hive.dart';

import '../database/hive_store.dart';

Future<void> setHiveStore() async {
  final box = await Hive.openBox('coursehub-data');
  HiveStore.userData = box.get('user') ?? {};
  HiveStore.contribution = box.get('contribution') ?? [];
  HiveStore.coursesData = box.get('courses-data') ?? {};
}
