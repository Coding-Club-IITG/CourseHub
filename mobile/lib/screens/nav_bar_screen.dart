import 'package:flutter/material.dart';
import 'package:flutter_svg/svg.dart';
import '../apis/authentication/login.dart';
import '../constants/themes.dart';
import '../database/hive_store.dart';
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

class _NavBarScreen extends State<NavBarScreen> {
  int _currentPageNumber = 0;
  bool _isSearched = false;
  String courseCode = "cs206";

  void returnToPageCallback(int a) {
    setState(() {
      _currentPageNumber = a;
    });
  }

  void setBrowseCourseCodeCallback(String code) {
    courseCode = code;
    screens[1] = BrowseScreen(
      callback: returnToPageCallback,
      courseCode: courseCode,
    );
  }

  void hideSearch() {
    setState(() {
      _isSearched = false;
    });
  }

  List<Widget> screens = [
    HomeScreen(
      setBrowseCourseCodeCallback: (String code) {},
      returnToPageCallback: (int a) {},
    ),
    BrowseScreen(
      callback: (int a) {},
      courseCode: "cs206",
    ),
    ContributeScreen(
      callback: (int a) {},
    ),
    const FavouritesScreen(),
    const ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    final user = HiveStore.getUserDetails();
    courseCode = user.courses[0].code;
    screens = [
      HomeScreen(
        setBrowseCourseCodeCallback: setBrowseCourseCodeCallback,
        returnToPageCallback: returnToPageCallback,
      ),
      BrowseScreen(
        callback: returnToPageCallback,
        courseCode: courseCode,
      ),
      ContributeScreen(
        callback: returnToPageCallback,
      ),
      const FavouritesScreen(),
      const ProfileScreen(),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const EmptyAppBar(),
      resizeToAvoidBottomInset: false,
      body: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                Container(
                  padding:
                      const EdgeInsets.symmetric(vertical: 20, horizontal: 30),
                  color: Colors.black,
                  child: !_isSearched
                      ? Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              flex: 10,
                              child: Text(
                                'CourseHub',
                                style: Themes.theme.textTheme.displayMedium,
                              ),
                            ),
                            const SizedBox(
                              width: 20,
                            ),
                            Expanded(
                              flex: 1,
                              child: GestureDetector(
                                onTap: () {
                                  setState(() {
                                    _isSearched = true;
                                  });
                                },
                                child: SvgPicture.asset(
                                  'assets/search.svg',
                                  colorFilter: const ColorFilter.mode(
                                      Colors.white, BlendMode.srcIn),
                                ),
                              ),
                            ),
                            const SizedBox(
                              width: 30,
                            ),
                            GestureDetector(
                                onTap: () => logoutHandler(context),
                                child: const Icon(
                                  Icons.logout,
                                  color: Colors.white,
                                ))
                          ],
                        )
                      : Container(),
                ),
                Expanded(
                  child: Stack(
                    children: [
                      Column(
                        children: [
                          Expanded(child: screens[_currentPageNumber]),
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
                                      color: const Color.fromRGBO(
                                          254, 207, 111, 1),
                                    )
                                  ],
                                ),
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceEvenly,
                                  children: [
                                    NavBarIcon(
                                        pageChangeCallback:
                                            returnToPageCallback,
                                        isSelected: _currentPageNumber == 0,
                                        label: 'Home'),
                                    NavBarIcon(
                                        pageChangeCallback:
                                            returnToPageCallback,
                                        isSelected: _currentPageNumber == 1,
                                        label: 'Browse'),
                                    Column(
                                      children: [
                                        Ink(
                                          child: InkWell(
                                            onTap: () {
                                              setState(() {
                                                _currentPageNumber = 2;
                                              });
                                            },
                                            child: Container(
                                              decoration: BoxDecoration(
                                                shape: BoxShape.circle,
                                                color: Colors.white,
                                                border: Border.all(
                                                    color: Colors.black,
                                                    width: 2.0),
                                              ),
                                              child: const Padding(
                                                padding: EdgeInsets.all(16.0),
                                                child: Icon(
                                                  Icons.add,
                                                  color: Colors.black,
                                                  size: 24.0,
                                                ),
                                              ),
                                            ),
                                          ),
                                        ),
                                        const Spacer(),
                                        Text("Contribute",
                                            style:
                                                Themes.darkTextTheme.bodySmall),
                                        const SizedBox(
                                          height: 8.0,
                                        )
                                      ],
                                    ),
                                    NavBarIcon(
                                        pageChangeCallback:
                                            returnToPageCallback,
                                        isSelected: _currentPageNumber == 3,
                                        label: 'Favourites'),
                                    NavBarIcon(
                                        pageChangeCallback:
                                            returnToPageCallback,
                                        isSelected: _currentPageNumber == 4,
                                        label: 'Profile')
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
            Visibility(
              visible: _isSearched,
              child: SearchScreen(
                callback: hideSearch,
              ),
            )
          ],
        ),
      ),
    );
  }
}
