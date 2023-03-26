import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:hive_flutter/adapters.dart';

import '../screens/splash_screen.dart';
import './constants/themes.dart';

//TODO: Do skl caching for android and ios flutter and bundle the apk
//TODO: ERROR HANDLING EVERWHERW
void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(statusBarColor: Colors.black,),
    );
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: Themes.theme,
      home: const SplashScreen(),
    );
  }
}
