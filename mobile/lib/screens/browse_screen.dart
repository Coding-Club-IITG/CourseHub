import 'package:coursehub/animations/custom_fade_in_animation.dart';
import 'package:coursehub/database/cache_store.dart';
import 'package:coursehub/widgets/common/splash_on_pressed.dart';
import 'package:flutter/material.dart';
import 'package:coursehub/database/hive_store.dart';
import 'package:coursehub/widgets/browse_screen/year_div.dart';
import 'package:coursehub/widgets/browse_screen/bread_crumbs.dart';
import 'package:coursehub/widgets/browse_screen/folder_explorer.dart';
import 'package:provider/provider.dart';

import '../providers/navigation_provider.dart';

class BrowseScreen extends StatefulWidget {
  const BrowseScreen({super.key});
  @override
  State<StatefulWidget> createState() => _BrowseScreen();
}

class _BrowseScreen extends State<BrowseScreen> {
  String path = "Home/";
  String year = "";
  List<String> availableYears = [];

  void addToPathCallback(String p) {
    setState(() {
      path += '$p/';
    });
  }

  void handleClick(String value) {
    setState(() {
      year = value;
      path = "Home/";
    });
  }

  void removeFromPath(int level) {
    List<String> pathArgs = path.split("/");
    String newPath = "";
    for (int i = 0; i < level; i++) {
      newPath += "${pathArgs[i]}/";
    }
    setState(() {
      path = newPath;
    });
  }

  @override
  Widget build(BuildContext context) {
    final navigationProvider = context.read<NavigationProvider>();

    return FutureBuilder(
        future: CacheStore.getBrowsedCourse(),
        builder: (context, snapshot) {
          if (snapshot.hasData) {
            final courseCode = snapshot.data ?? 'error';

            final isAvailable =
                CacheStore.courseAvailability[courseCode] ?? false;

            if (isAvailable) {
              Map<dynamic, dynamic> data;

              if (CacheStore.isTempCourse) {
                data = CacheStore.tempCourseData;
              } else {
                data = HiveStore.coursesData[courseCode.toLowerCase()];
              }

              List<String> pathArgs = path.split("/");

              availableYears.clear();
              String lastYear = "";
              for (var c in data["children"]) {
                availableYears.add(c["name"]);
                lastYear = c["name"];
              }

              if (year == "") {
                year = lastYear;
              }

              Map<dynamic, dynamic> dataToShow = data;
              List<Widget> navigationCrumbs = [];
              String currentTitle = data['code'].toUpperCase();
              int level = 1;
              for (var p in pathArgs) {
                if (p == "") continue;
                if (p == "Home") {
                  for (var child in dataToShow["children"]) {
                    if (child["name"] == year) {
                      dataToShow = child;
                      break;
                    }
                  }
                  navigationCrumbs.add(
                    BreadCrumb(
                      name: "Home",
                      level: 0,
                      callback: (level) =>
                          navigationProvider.changePageNumber(0),
                    ),
                  );
                  navigationCrumbs.add(
                    BreadCrumb(
                      name: data['code'].toUpperCase(),
                      level: level,
                      callback: removeFromPath,
                    ),
                  );
                } else {
                  for (var child in dataToShow["children"]) {
                    if (child["name"] == p) {
                      dataToShow = child;
                      break;
                    }
                  }
                  navigationCrumbs.add(
                    BreadCrumb(
                      name: p,
                      level: level,
                      callback: removeFromPath,
                    ),
                  );
                  currentTitle = p;
                }
                level++;
              }
              navigationCrumbs.removeLast();

              return WillPopScope(
                onWillPop: () async {
                  level -= 2;

                  if (level <= 0) {
                    navigationProvider.changePageNumber(0);
                    return false;
                  } else {
                    removeFromPath(level);
                    return false;
                  }
                },
                child: CustomFadeInAnimation(
                  child: Column(
                    children: [
                      Expanded(
                        flex: 7,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10),
                          color: Colors.black,
                          child: Column(
                            children: [
                              const SizedBox(
                                height: 10,
                              ),
                              Expanded(
                                flex: 2,
                                child: ListView.builder(
                                  scrollDirection: Axis.horizontal,
                                  physics: const BouncingScrollPhysics(),
                                  itemBuilder: (context, index) =>
                                      navigationCrumbs[index],
                                  itemCount: navigationCrumbs.length,
                                ),
                              ),
                              Expanded(
                                flex: 2,
                                child: Row(
                                  children: [
                                    const SizedBox(
                                      width: 8,
                                    ),
                                    Text(
                                      currentTitle,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                          fontSize: 24,
                                          color: Colors.white,
                                          fontWeight: FontWeight.w700),
                                    ),
                                    const Spacer(),
                                    SplashOnPressed(
                                        splashColor: Colors.grey,
                                        onPressed: () {},
                                        child: const Padding(
                                          padding: EdgeInsets.all(6),
                                          child: Icon(
                                            Icons.share,
                                            color: Colors.white,
                                          ),
                                        )),
                                    const SizedBox(
                                      width: 10,
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(
                                height: 10,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(
                        height: 5,
                      ),
                      Expanded(
                        flex: 5,
                        child: YearDiv(
                          callback: handleClick,
                          availableYears: availableYears,
                          year: year,
                        ),
                      ),
                      const SizedBox(
                        height: 5,
                      ),
                      Expanded(
                        flex: 40,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 8),
                          child: FolderExplorer(
                            data: dataToShow,
                            callback: addToPathCallback,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            } else {
              return Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Image.asset(
                      'assets/my_profile_no_contri.png',
                      width: 300,
                    ),
                    const SizedBox(
                      height: 20,
                    ),
                    Text(
                      '$courseCode is presently Unavailable!',
                      style: const TextStyle(color: Colors.black),
                    ),
                  ],
                ),
              );
            }
          } else {
            return Container();
          }
        });
  }
}
