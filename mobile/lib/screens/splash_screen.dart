import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:animated_text_kit/animated_text_kit.dart';

import '../../apis/courses/is_course_updated.dart';
import '../../apis/miscellaneous/funfacts.dart';
import '../../apis/protected.dart';
import '../../database/cache_store.dart';
import '../apis/authentication/login.dart';
import './login_screen.dart';
import './nav_bar_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    navigateToHome();
  }

  void navigateToHome() async {
    final prefs = await SharedPreferences.getInstance();

    CacheStore.isGuest = prefs.getBool('isGuest') ?? false;

    if (await getAccessToken() != 'error') {
      await isCourseUpdated();
    } 
    await getFunFacts(fetchAgain: true);

    if (!mounted) return;
    Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (context) => FutureBuilder(
              future: isLoggedIn(),
              builder: (context, snapshot) {
                if (snapshot.hasData) {
                  final isLoggedIn = snapshot.data ?? false;
                  if (!isLoggedIn) {
                    return const LoginScreen();
                  } else {
                    return const NavBarScreen();
                  }
                } else {
                  return const Scaffold(
                    backgroundColor: Colors.white,
                  );
                }
              }),
        ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: DefaultTextStyle(
          style: const TextStyle(
              fontSize: 50.0, fontWeight: FontWeight.w700, color: Colors.white),
          child: AnimatedTextKit(
            totalRepeatCount: 1,
            animatedTexts: [
              TypewriterAnimatedText(
                'CourseHub',
                speed: const Duration(milliseconds: 150),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
