import 'dart:developer';

import 'package:coursehub/animations/custom_fade_in_animation.dart';
import 'package:coursehub/database/cache_store.dart';
import 'package:coursehub/widgets/common/splash_on_pressed.dart';

import 'package:flutter/material.dart';
import 'package:coursehub/database/hive_store.dart';
import 'package:coursehub/widgets/browse_screen/year_div.dart';
import 'package:coursehub/widgets/browse_screen/bread_crumbs.dart';
import 'package:coursehub/widgets/browse_screen/folder_explorer.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';

import '../providers/navigation_provider.dart';
import '../utilities/dynamic_links.dart';

class BrowseScreen extends StatefulWidget {
  const BrowseScreen({super.key});
  @override
  State<StatefulWidget> createState() => _BrowseScreen();
}

class _BrowseScreen extends State<BrowseScreen> {
  List<String> availableYears = [];

  void addToPathCallback(String p) {
    setState(() {
      CacheStore.browsePath += '$p/';
    });
  }

  void handleClick(String value) {
    setState(() {
      CacheStore.browseYear = value;
      CacheStore.browsePath = "Home/";
    });
  }

  void removeFromPath(int level) {
    List<String> pathArgs = CacheStore.browsePath.split("/");
    String newPath = "";
    for (int i = 0; i < level; i++) {
      newPath += "${pathArgs[i]}/";
    }
    setState(() {
      CacheStore.browsePath = newPath;
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

              List<String> pathArgs = CacheStore.browsePath.split("/");

              availableYears.clear();
              String lastYear = "";
              for (var c in data["children"]) {
                availableYears.add(c["name"]);
                lastYear = c["name"];
              }

              if (CacheStore.browseYear == "") {
                CacheStore.browseYear = lastYear;
              }

              Map<dynamic, dynamic> dataToShow = data;
              List<Widget> navigationCrumbs = [];
              String currentTitle = data['code'].toUpperCase();
              int level = 1;
              for (var p in pathArgs) {
                if (p == "") continue;
                if (p == "Home") {
                  for (var child in dataToShow["children"]) {
                    if (child["name"] == CacheStore.browseYear) {
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
                                    SizedBox(
                                      width: 250,
                                      child: Text(
                                        currentTitle,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                            fontSize: 24,
                                            color: Colors.white,
                                            fontWeight: FontWeight.w700),
                                      ),
                                    ),
                                    const Spacer(),
                                    SplashOnPressed(
                                      splashColor: Colors.grey,
                                      onPressed: () async {
                                        String x = '$courseCode/';
                                        x += '${CacheStore.browseYear}/';

                                        List<String> abc =
                                            CacheStore.browsePath.split('/');

                                        for (var i = 1; i < abc.length; i++) {
                                          x += abc[i];
                                          x += '/';
                                        }
                                        x = x.substring(0, x.length - 1);

                                        log(dataToShow.toString());

                                        final link = await FirebaseDynamicLink
                                            .createDynamicLink(
                                                currentTitle, '', x);
                                        await Share.share(link,
                                            subject:
                                                '$currentTitle \n CourseHub');
                                      },
                                      child: const Padding(
                                        padding: EdgeInsets.all(6),
                                        child: Icon(
                                          Icons.share,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(
                                      width: 20,
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
                          year: CacheStore.browseYear,
                        ),
                      ),
                      const SizedBox(
                        height: 5,
                      ),
                      Expanded(
                        flex: 40,
                        child: FolderExplorer(
                          data: dataToShow,
                          callback: addToPathCallback,
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
