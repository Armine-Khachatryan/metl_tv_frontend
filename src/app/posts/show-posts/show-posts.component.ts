import {Component, OnInit} from '@angular/core';
import {PostsService} from '@core/services/posts.service';
import trackByElement from '@core/helpers/track-by-element';
import {UserStoreService} from '@core/services/stores/user-store.service';
import {PostsStoreService} from '@core/services/stores/posts-store.service';
import {MatPaginatorModule} from '@angular/material/paginator';
import { PageEvent } from '@angular/material/paginator';

@Component({
    selector: 'app-show-posts',
    templateUrl: './show-posts.component.html',
    styleUrls: ['./show-posts.component.scss']
})
export class ShowPostsComponent implements OnInit {
    posts = [];
    trackByElement = trackByElement;
    authUser;
    allPost: any[];

    // Pagination

    paginatorLength;
    paginatorPageSize = 10;
    perPage = 1;
    pageSizeOptions: number[] = [5, 10, 25, 100];
    pageEvent: PageEvent;

    // /////////////////////////////// //

    constructor(
        private postsService: PostsService,
        public postsStore: PostsStoreService,
        private userStore: UserStoreService
    ) {
    }

    ngOnInit(): void {
        this.postsStore.allPosts$.subscribe((data: any) => {
            this.allPost = data.posts;
            this.paginatorLength = data.totalCount;
        });
        this.authUser = this.userStore.authUser;
        this.getAllPosts().then();
    }
    pagination(e) {
        this.perPage = e.pageIndex + 1;
        this.paginatorPageSize = e.pageSize;
        this.paginatorLength = e.length;
        this.getAllPosts().then();
        this.paginatorLength = this.postsService.pageSize;
    }

    async getAllPosts() {
        const params = {
            user_id: this.authUser.id,
            offset: this.perPage,
            limit: this.paginatorPageSize
        };
        await this.postsService.getAllPosts(params);
    }
    delete() {
        if ((this.paginatorLength - 1) % this.paginatorPageSize === 0) { this.perPage -= 1; }
        if (this.perPage <= 1) { this.perPage = 1; }
        this.getAllPosts().then();
    }

    vote(postData) {
        this.postsService.vote(postData);
    }

    searchPost(value) {
        this.postsService.searchPost({ search: value }).subscribe((e) => {
            console.log(e);
        });
    }

}
