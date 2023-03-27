import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../apis/courses/search_course.dart';
import '../models/search_result.dart';
import '../widgets/common/custom_snackbar.dart';
import '../widgets/nav_bar/search_card.dart';

class SearchScreen extends StatefulWidget {
  final Function callback;
  const SearchScreen({super.key, required this.callback});

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
      showSnackBar('Something went wrong!', context);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 30, horizontal: 20),
      width: double.infinity,
      height: double.infinity,
      color: const Color.fromRGBO(255, 255, 255, 0.95),
      child: Column(
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
                      showSnackBar('Something went wrong', context);
                    }
                  },
                  textInputAction: TextInputAction.search,
                  controller: _searchController,
                  keyboardType: TextInputType.name,
                  cursorColor: Colors.grey,
                  decoration: const InputDecoration(
                    hintText: 'Search Courses',
                    contentPadding: EdgeInsets.symmetric(horizontal: 2),
                    enabledBorder: UnderlineInputBorder(),
                    focusedBorder: UnderlineInputBorder(),
                  ),
                ),
              ),
              Expanded(
                flex: 1,
                child: GestureDetector(
                  onTap: () async {
                    try {
                      await search(_searchController.text);
                    } catch (e) {
                      showSnackBar('Something went wrong!', context);
                    }
                  },
                  child: SvgPicture.asset(
                    'assets/search.svg',
                    colorFilter:
                        const ColorFilter.mode(Colors.black, BlendMode.srcIn),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(
            height: 50,
          ),
          Expanded(
            child: GestureDetector(
              onTap: () {
                widget.callback();
              },
              child: SizedBox(
                child: found == null
                    ? Text(
                        text,
                        maxLines: 2,
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                            color: Colors.black, fontWeight: FontWeight.w500),
                      )
                    : found ?? false
                        ? ListView.builder(
                            physics: const BouncingScrollPhysics(),
                            itemBuilder: (context, index) => SearchCard(
                              isAvailable: searchResult[index].isAvailable,
                              courseCode: searchResult[index].code,
                              courseName: searchResult[index].name,
                              callback: () {},
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
            ),
          )
        ],
      ),
    );
  }
}
