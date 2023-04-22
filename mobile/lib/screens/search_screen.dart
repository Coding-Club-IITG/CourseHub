import 'dart:math';

import 'package:coursehub/apis/miscellaneous/funfacts.dart';
import 'package:flutter/material.dart';
import 'package:flutter_staggered_animations/flutter_staggered_animations.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../apis/courses/search_course.dart';
import '../models/search_result.dart';
import '../widgets/common/custom_snackbar.dart';
import '../widgets/nav_bar/search_card.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _searchController = TextEditingController();
  late List<SearchResult> searchResult;
  bool? found;
  var text = 'Search by name or course code,\nPress Enter to Search';
  Future<void> search(value) async {
    setState(() {
      text = 'Loading...';
    });
    try {
      final res = await searchCourse(value.toString().trim());

      setState(() {
        found = res['found'];
      });

      List<dynamic> results = res['results'];
      if (found ?? false) {
        searchResult = results.map((e) => SearchResult.fromJson(e)).toList();
      }

      text = 'Search by name or course code,\nPress Enter to Search';
    } catch (e) {
      showSnackBar('Something went wrong !', context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
        future: getFunFacts(),
        builder: (context, snapshot) {
          if (!snapshot.hasData) {
            return Container();
          }


          return Stack(
            alignment: Alignment.bottomCenter,
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(vertical: 30, horizontal: 20),
                width: double.infinity,
                height: double.infinity,
                color: Colors.white,
                child: Column(
                  children: AnimationConfiguration.toStaggeredList(
                    duration: const Duration(milliseconds: 200),
                    childAnimationBuilder: (widget) => SlideAnimation(
                      horizontalOffset: 50.0,
                      child: FadeInAnimation(
                        child: widget,
                      ),
                    ),
                    children: [
                      Row(
                        children: [
                          Expanded(
                            flex: 6,
                            child: TextField(
                              onSubmitted: (value) async {
                                try {
                                  await search(value);
                                } catch (e) {
                                  showSnackBar(
                                      'Something went wrong !', context);
                                }
                              },
                              textInputAction: TextInputAction.search,
                              controller: _searchController,
                              keyboardType: TextInputType.name,
                              cursorColor: Colors.grey,
                              decoration: InputDecoration(
                                hintText: 'Search Courses',
                                suffixIconConstraints: const BoxConstraints(
                                  maxHeight: 32,
                                ),
                                suffixIcon: GestureDetector(
                                  onTap: () async {
                                    try {
                                      await search(_searchController.text);
                                    } catch (e) {
                                      showSnackBar(
                                          'Something went wrong !', context);
                                    }
                                  },
                                  child: Padding(
                                    padding: const EdgeInsets.only(right: 12),
                                    child: SvgPicture.asset(
                                      'assets/search.svg',
                                      colorFilter: const ColorFilter.mode(
                                          Colors.black, BlendMode.srcIn),
                                    ),
                                  ),
                                ),
                                contentPadding:
                                    const EdgeInsets.symmetric(horizontal: 12),
                                enabledBorder: const OutlineInputBorder(
                                  borderRadius: BorderRadius.all(
                                    Radius.circular(0),
                                  ),
                                ),
                                focusedBorder: const OutlineInputBorder(
                                  borderRadius: BorderRadius.all(
                                    Radius.circular(0),
                                  ),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(
                        height: 30,
                      ),
                      SizedBox(
                        height: 200,
                        child: found == null
                            ? Text(
                                text,
                                maxLines: 2,
                                textAlign: TextAlign.center,
                                style: const TextStyle(
                                  color: Colors.black,
                                  fontWeight: FontWeight.w500,
                                ),
                              )
                            : found ?? false
                                ? ListView.builder(
                                    physics: const BouncingScrollPhysics(),
                                    itemBuilder: (context, index) => SearchCard(
                                      isTempCourse: true,
                                      isAvailable:
                                          searchResult[index].isAvailable,
                                      courseCode: searchResult[index].code,
                                      courseName: searchResult[index].name,
                                      callback: null,
                                    ),
                                    itemCount: searchResult.length,
                                  )
                                : const Text(
                                    'No Results Found!',
                                    style: TextStyle(
                                        color: Colors.black,
                                        fontWeight: FontWeight.w700),
                                  ),
                      ),
                      const SizedBox(
                        height: 50,
                      ),
                      SizedBox(
                        width: 300,
                        child: Column(
                          children: [
                            const Text(
                              'Fun Fact',
                              style: TextStyle(color: Colors.black),
                            ),
                            const SizedBox(
                              height: 5,
                            ),
                            Text(
                              snapshot.data![Random()
                                      .nextInt(snapshot.data!.length)]
                                  .toString(),
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                  color: Colors.black,
                                  fontWeight: FontWeight.w400),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Image.asset(
                    'assets/search_library.png',
                    fit: BoxFit.contain,
                  ),
                  const SizedBox(
                    height: 10,
                  )
                ],
              )
            ],
          );
        });
  }
}
