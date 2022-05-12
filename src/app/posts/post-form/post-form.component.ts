import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {UserStoreService} from '@core/services/stores/user-store.service';
import { ActivatedRoute, ActivationEnd, NavigationEnd, Router } from '@angular/router';
import {PostsService} from '@core/services/posts.service';
import {GroupsStoreService} from '@core/services/stores/groups-store.service';
import {Location} from '@angular/common';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { ChangeEvent } from '@ckeditor/ckeditor5-angular/ckeditor.component';
import {CK_EDITOR_CONFIG} from '@core/constants/global';
import {SocketIoService} from '@core/services/socket-io.service';
import {PostsStoreService} from '@core/services/stores/posts-store.service';

@Component({
    selector: 'app-post-form',
    templateUrl: './post-form.component.html',
    styleUrls: ['./post-form.component.scss']
})
export class PostFormComponent implements OnInit, OnDestroy {
    postForm: FormGroup;
    authUser;
    public Editor = ClassicEditor;

    @Input() selectedGroup;
    @Output() formReady = new EventEmitter();

    public dataPosts = '';
    defaultSelect = 'Select a group';
    editPost;

    imageFile;
    resultFileUpload;
    imageUploadEditing;

    constructor(
        private fb: FormBuilder,
        public userStore: UserStoreService,
        public groupsStore: GroupsStoreService,
        private postsStore: PostsStoreService,
        private socketService: SocketIoService,
        private route: ActivatedRoute,
        private router: Router,
        private postsService: PostsService,
        private _location: Location
    ) {
    }

    ngOnInit(): void {
        const queryParams = this.route.snapshot.queryParams;
        this.authUser = this.userStore.authUser;
        this.Editor.defaultConfig = CK_EDITOR_CONFIG;

        // console.log(queryParams.group_id)
        this.initForm(queryParams);
        this.selectedGroup = this.groupsStore.groups.find(g => g.id === +queryParams.group_id);
        this.postsStore.editePost$.subscribe((post) => {
            this.editPost = post;
            // console.log(this.editPost);
        }).unsubscribe();
        this.postsStore.fileImg$.subscribe((file) => {
            console.log(file);
        });
    }

    addPhoto(event) {
        console.log(event);
        this.imageFile = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const url = e.target.result;
            this.dataPosts = this.dataPosts + `<figure class="image">\n' +
                '    <img src=${url} alt="Description of an image">\n' +
                '</figure>`;
        };
        reader.readAsDataURL(this.imageFile);
    }

    onChange(editor) {
        console.log( editor );
    }

    public onReady(editor) {
        console.log(editor);
        editor.ui.getEditableElement().parentElement.insertBefore(
            editor.ui.view.toolbar.element,
            editor.ui.getEditableElement()
        );
        editor.plugins.get( 'FileRepository' ).createUploadAdapter = ( loader ) => {
            return new UploadAdapter(loader, editor.t, this.postsStore);
        };
    }

    initForm(queryParams) {
        this.postForm = this.fb.group({
            description: ['', Validators.required],
            username: [this.userStore.authUser.username],
            author_id: [this.userStore.authUser?.id],
            group_id: [queryParams.group_id || ''],
            votes: 1
        });
        console.log(this.postForm.value);
    }

    selectGroup(e) {
        console.log(e.target.value);
        this.selectedGroup = this.groupsStore.groups.find(g => g.id === +e.target.value);
    }

    async savePost() {
        // this.formReady.emit(this.postForm.value);
        const domParser = new DOMParser();
        const htmlElement = domParser.parseFromString(this.postForm.value.description, 'text/html');
        const imgTag = htmlElement.getElementsByTagName('img');
        // @ts-ignore
        for (const img of imgTag) {

        }
        // imgTag[0].src = 'sdsdsds';
        console.log(imgTag);
        console.log(htmlElement);
        if (this.postForm.valid) {
            console.log(this.postForm.value, this.selectedGroup);
            this.postsService.add(this.postForm.value).subscribe((dt) => {
                this.postsStore.setAllPosts(dt);
                this.socketService.postAdded({
                    from_user: this.authUser,
                    ...this.postForm.value,
                    group: this.selectedGroup,
                    msg: this.getPostNotificationText()
                });
                this._location.back();
                this.postForm.reset();
            });
        }
    }

    getPostNotificationText() {
        let msg = `<strong>${this.authUser.first_name} ${this.authUser.last_name}</strong> added a new post`;
        if (this.selectedGroup) {
            msg = `<strong>${this.authUser.first_name} ${this.authUser.last_name}</strong> posted in
                    <strong>${this.selectedGroup.name}</strong> group`;
        }

        return msg;
    }

    ngOnDestroy() {
        this.postsStore.setEditePost(null);
    }

}

export class UploadAdapter {
    private loader;
    private t;
    private postsStore;
    constructor(loader, t, postsStore) {
        this.loader = loader;
        this.t = t;
        this.postsStore = postsStore;
    }

    upload(loader, t) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            // tslint:disable-next-line:only-arrow-functions
            reader.onload = function(): void {
                resolve({ default: reader.result });
            };

            // tslint:disable-next-line:only-arrow-functions
            reader.onerror = function(error) {
                reject(error);
            };

            this.loader.file.then(async (file) => {
                reader.readAsDataURL(file);
                await this.postsStore.setImageUpload(file);
            });
        });
    }
}
