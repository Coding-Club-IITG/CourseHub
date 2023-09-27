import 'dart:io';

import 'package:flutter/material.dart';

import '../apis/authentication/login.dart';
import '../constants/themes.dart';
import '../screens/nav_bar_screen.dart';
import '../widgets/common/custom_linear_progress.dart';
import '../widgets/common/custom_snackbar.dart';
import '../widgets/login_screen/cc_branding.dart';
import '../widgets/login_screen/login_button.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  var _isLoading = false;
  final theImage = const AssetImage('assets/landing.png');

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        top: Platform.isAndroid,
        bottom: Platform.isAndroid,
        child: Stack(
          children: [
            Container(
              decoration: BoxDecoration(
                image: DecorationImage(
                  image: theImage,
                  fit: BoxFit.cover,
                ),
              ),
            ),
            Column(
              children: [
                Expanded(
                  flex: 7,
                  child: Row(
                    children: [
                      const Spacer(
                        flex: 5,
                      ),
                      Expanded(
                        flex: 2,
                        child: Container(
                          color: Colors.black,
                          child:const  Column(
                            children:  [
                              SizedBox(
                                height: 50,
                              ),
                              RotatedBox(
                                quarterTurns: 1,
                                child: Text(
                                  'CourseHub',
                                  style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 70,
                                      fontWeight: FontWeight.w700),
                                ),
                              ),
                              Spacer(),
                              CCBranding(),
                              SizedBox(
                                height: 20,
                              )
                            ],
                          ),
                        ),
                      )
                    ],
                  ),
                ),
                Expanded(
                  flex: 2,
                  child: Container(
                    padding:
                        const EdgeInsets.only(top: 20, left: 16, right: 16),
                    color: Themes.kYellow,
                    child: Column(
                      children: [
                        const Expanded(
                          flex: 6,
                          child: Text(
                            'Your go-to platform for all your academic needs. Get access to past papers, lecture slides, assignments, tutorials, notes and more to help you ace your exams',
                            textAlign: TextAlign.left,
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: Colors.black,
                              fontSize: 13.0,
                            ),
                          ),
                        ),
                        Expanded(
                          flex: 6,
                          child: Material(
                            color: Colors.black,
                            child: InkWell(
                              splashColor: Colors.white,
                              onTap: () async {
                                try {
                                  setState(() {
                                    _isLoading = true;
                                  });
                                  await authenticate();
                                  setState(() {
                                    _isLoading = false;
                                  });
                                  if (!mounted) return;
                                  Navigator.of(context).pushReplacement(
                                    MaterialPageRoute(
                                      builder: (context) =>
                                          const NavBarScreen(),
                                    ),
                                  );

                                  showSnackBar(
                                      'Successfully Logged In!', context);
                                } catch (e) {
                                  setState(() {
                                    _isLoading = false;
                                  });

                                  showSnackBar(
                                      'Something Went Wrong!', context);
                                }
                              },
                              child: const LoginButton(),
                            ),
                          ),
                        ),
                        const SizedBox(
                          height: 10,
                        ),
                        Expanded(
                          flex: 3,
                          child: GestureDetector(
                            onTap: () async {
                              try {
                                setState(() {
                                  _isLoading = true;
                                });
                                await authenticateGuest();
                                setState(() {
                                  _isLoading = false;
                                });
                                if (!mounted) return;
                                Navigator.of(context).pushReplacement(
                                  MaterialPageRoute(
                                    builder: (context) => const NavBarScreen(),
                                  ),
                                );

                                showSnackBar(
                                    'Successfully Logged In!', context);
                              } catch (e) {
                  
                                setState(() {
                                  _isLoading = false;
                                });
                                showSnackBar('Something Went Wrong!', context);
                              }
                            },
                            child: const Text(
                              "Login as Guest",
                              style: TextStyle(
                                  color: Colors.black,
                                  fontSize: 14,
                                  fontWeight: FontWeight.w400,
                                  decoration: TextDecoration.underline),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            Visibility(
              visible: _isLoading,
              child: const CustomLinearProgress(
                text: 'Loading your courses, favourites and contributions...',
              ),
            )
            //
          ],
        ),
      ),
    );
  }
}
