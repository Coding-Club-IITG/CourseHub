import 'package:coursehub/screens/favourites_screen.dart';
import 'package:flutter/material.dart';
import 'package:coursehub/constants/themes.dart';
import 'package:coursehub/database/hive_store.dart';
import 'package:coursehub/widgets/browse_screen/year_div.dart';
import 'package:coursehub/widgets/browse_screen/bread_crumbs.dart';
import 'package:coursehub/widgets/browse_screen/folder_explorer.dart';

class BrowseScreen extends StatefulWidget {
  final String courseCode;
  final Function(int a) callback;

  const BrowseScreen(
      {super.key, required this.callback, required this.courseCode});
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
    // Map<dynamic, dynamic> data =
    //     HiveStore.coursesData[widget.courseCode.toLowerCase()];

    // List<String> pathArgs = path.split("/");

    // availableYears.clear();
    // String lastYear = "";
    // for (var c in data["children"]) {
    //   availableYears.add(c["name"]);
    //   lastYear = c["name"];
    // }

    // if (year == "") {
    //   year = lastYear;
    // }

    // Map<dynamic, dynamic> dataToShow = data;
    // List<Widget> navigationCrumbs = [];
    // String currentTitle = data['code'].toUpperCase();
    // int level = 1;
    // for (var p in pathArgs) {
    //   if (p == "") continue;
    //   if (p == "Home") {
    //     for (var child in dataToShow["children"]) {
    //       if (child["name"] == year) {
    //         dataToShow = child;
    //         break;
    //       }
    //     }
    //     navigationCrumbs.add(
    //       BreadCrumb(
    //         name: "Home",
    //         level: 0,
    //         callback: (level) => widget.callback(0),
    //       ),
    //     );
    //     navigationCrumbs.add(
    //       BreadCrumb(
    //         name: data['code'].toUpperCase(),
    //         level: level,
    //         callback: removeFromPath,
    //       ),
    //     );
    //   } else {
    //     for (var child in dataToShow["children"]) {
    //       if (child["name"] == p) {
    //         dataToShow = child;
    //         break;
    //       }
    //     }
    //     navigationCrumbs.add(
    //       BreadCrumb(
    //         name: p,
    //         level: level,
    //         callback: removeFromPath,
    //       ),
    //     );
    //     currentTitle = p;
    //   }
    //   level++;
    // }
    // navigationCrumbs.removeLast();
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
          const Text(
            'File Browsing Coming Soon',
            style: TextStyle(color: Colors.black),
          ),
        ],
      ),
    );
    // return Container(
    //   color: Colors.white,
    //   child: Column(
    //     children: [
    //       Expanded(
    //         flex: 2,
    //         child: Container(
    //           padding: const EdgeInsets.symmetric(horizontal: 10),
    //           color: Themes.kYellow,
    //           child: ListView.builder(
    //             scrollDirection: Axis.horizontal,
    //             physics: const BouncingScrollPhysics(),
    //             itemBuilder: (context, index) => navigationCrumbs[index],
    //             itemCount: navigationCrumbs.length,
    //           ),
    //         ),
    //       ),
    //       Expanded(
    //         flex: 2,
    //         child: Container(
    //           padding: const EdgeInsets.symmetric(horizontal: 10),
    //           color: Themes.kYellow,
    //           child: Row(
    //             children: [
    //               SizedBox(
    //                 width: MediaQuery.of(context).size.width * 0.6,
    //                 child: Text(
    //                   currentTitle,
    //                   overflow: TextOverflow.ellipsis,
    //                   style: Themes.darkTextTheme.displayLarge,
    //                 ),
    //               ),
    //               const Spacer(),
    //               IconButton(
    //                   icon: const Icon(
    //                     Icons.star,
    //                     size: 30.0,
    //                   ),
    //                   color: Colors.black54,
    //                   onPressed: () {
    //                     //TODO action of fav
    //                   }),
    //               const SizedBox(
    //                 width: 8.0,
    //               ),
    //               IconButton(
    //                 icon: const Icon(
    //                   Icons.share,
    //                   size: 30.0,
    //                 ),
    //                 color: Colors.black54,
    //                 onPressed: () {
    //                   // TODO create share link
    //                 },
    //               ),
    //             ],
    //           ),
    //         ),
    //       ),
    //       Expanded(
    //         flex: 20,
    //         child: FolderExplorer(
    //           data: dataToShow,
    //           callback: addToPathCallback,
    //         ),
    //       ),
    //       Expanded(
    //         flex: 3,
    //         child: YearDiv(
    //           callback: handleClick,
    //           availableYears: availableYears,
    //           year: year,
    //         ),
    //       )
    //     ],
    //   ),
    // );
  }
}
