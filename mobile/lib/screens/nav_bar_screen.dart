

import 'package:coursehub/database/cache_store.dart';
import 'package:coursehub/providers/cache_provider.dart';
import 'package:coursehub/screens/exam_screen.dart';
import 'package:coursehub/widgets/common/menu_drawer.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../constants/themes.dart';
import '../screens/browse_screen.dart';
import '../screens/contribute_screen.dart';
import '../screens/favourites_screen.dart';
import '../screens/home_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/search_screen.dart';
import '../widgets/nav_bar/nav_bar_icon.dart';

import '../widgets/common/empty_app_bar.dart';

class NavBarScreen extends StatefulWidget {
  const NavBarScreen({super.key});

  @override
  State<StatefulWidget> createState() => _NavBarScreen();
}

class _NavBarScreen extends State<NavBarScreen>
    with SingleTickerProviderStateMixin {
  int _currentPageNumber = 0;

  late List<Widget> screens;
  late AnimationController _controller;

  void returnToPageCallback(int a) {
    if (a != 1) {
      CacheStore.isTempCourse = false;
    }
    setState(() {
      if (_currentPageNumber == 2) _controller.reverse(from: 0.75);
      _currentPageNumber = a;
    });
  }

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 300),
      upperBound: 0.5,
    );
    screens = [
      HomeScreen(
        returnToPageCallback: returnToPageCallback,
      ),
      BrowseScreen(
        callback: returnToPageCallback,
      ),
      ContributeScreen(
        callback: returnToPageCallback,
      ),
      FavouritesScreen(returnToPageCallback: returnToPageCallback),
      ProfileScreen(
        returnToPageCallback: returnToPageCallback,
      ),
      SearchScreen(
        returnToPageCallback: returnToPageCallback,
      )
    ];
  }

  @override
  void dispose() {
    super.dispose();
    _controller.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const EmptyAppBar(),
      resizeToAvoidBottomInset: false,
      backgroundColor: Colors.white,
      drawer: const MenuDrawer(),
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                Expanded(child: ExamScreen()),
                // Expanded(child: screens[_currentPageNumber]),
                const SizedBox(
                  height: 60,
                ),
              ],
            ),
            Column(
              children: [
                const Spacer(),
                SizedBox(
                  height: 90.0,
                  child: Stack(
                    children: [
                      Column(
                        children: [
                          const Spacer(),
                          Container(
                            height: 68.0,
                            color: const Color.fromRGBO(254, 207, 111, 1),
                          )
                        ],
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          NavBarIcon(
                              pageChangeCallback: returnToPageCallback,
                              isSelected: _currentPageNumber == 0,
                              label: 'Home'),
                          NavBarIcon(
                              pageChangeCallback: returnToPageCallback,
                              isSelected: _currentPageNumber == 1,
                              label: 'Browse'),
                          Column(
                            children: [
                              GestureDetector(
                                onTap: () {
                                  setState(() {
                                    if (_currentPageNumber != 2) {
                                      _controller.forward(from: 0.0);
                                    } else {
                                      _controller.reverse(from: 0.75);
                                    }
                                    if (_currentPageNumber == 2) {
                                      _currentPageNumber = 0;
                                    } else {
                                      _currentPageNumber = 2;
                                    }
                                  });
                                },
                                child: Container(
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Colors.white,
                                    border: Border.all(
                                        color: Colors.black, width: 2.0),
                                  ),
                                  child: Padding(
                                    padding: const EdgeInsets.all(12.0),
                                    child: RotationTransition(
                                      turns: Tween(begin: 0.0, end: 0.75)
                                          .animate(_controller),
                                      child: const Icon(
                                        Icons.add,
                                        color: Colors.black,
                                        size: 32.0,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                              const Spacer(),
                              Text("Contribute",
                                  style: Themes.darkTextTheme.bodySmall),
                              const SizedBox(
                                height: 8.0,
                              )
                            ],
                          ),
                          NavBarIcon(
                              pageChangeCallback: returnToPageCallback,
                              isSelected: _currentPageNumber == 3,
                              label: 'Favourites'),
                          NavBarIcon(
                              pageChangeCallback: returnToPageCallback,
                              isSelected: _currentPageNumber == 4,
                              label: 'Profile')
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            Consumer<CacheProvider>(
              builder: (context, cacheprovider, child) {
                return Visibility(
                  visible: cacheprovider.isDownloading,
                  child: Container(
                    width: double.infinity,
                    height: double.infinity,
                    color: const Color.fromRGBO(255, 255, 255, 0.9),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}
